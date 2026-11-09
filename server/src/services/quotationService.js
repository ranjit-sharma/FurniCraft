import { Quotation, QuotationSequence, User, DEFAULT_TERMS_AND_CONDITIONS } from '../models/index.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { withDuplicateRetry } from '../utils/codeGenerator.js';

/**
 * Formats a given Date to "DD MMM YYYY" in Asia/Kolkata timezone.
 * E.g. "09 Nov 2026"
 */
export const formatIndianDate = (date = new Date()) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

/**
 * Ensures the given Thekedar user has a permanent unique thekedarCode (e.g. TK001, TK002).
 * If not already set, it allocates the next available code atomically.
 */
export const ensureThekedarCode = async (thekedarUser) => {
  if (thekedarUser.thekedarCode && thekedarUser.thekedarCode.trim()) {
    return thekedarUser.thekedarCode.trim();
  }

  // Reload fresh user from DB to avoid stale in-memory object
  const freshUser = await User.findById(thekedarUser._id).select('thekedarCode');
  if (freshUser && freshUser.thekedarCode && freshUser.thekedarCode.trim()) {
    return freshUser.thekedarCode.trim();
  }

  return withDuplicateRetry(async () => {
    // Find all users that have a code to determine highest numeric value
    const usersWithCode = await User.find(
      { thekedarCode: { $exists: true, $ne: null } },
      'thekedarCode'
    ).lean();

    let maxNum = 0;
    const regex = /^TK(\d+)$/i;
    for (const t of usersWithCode) {
      if (t.thekedarCode) {
        const match = t.thekedarCode.match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }

    let nextNum = Math.max(maxNum + 1, usersWithCode.length + 1);
    let candidate = `TK${String(nextNum).padStart(3, '0')}`;

    while (await User.exists({ thekedarCode: candidate })) {
      nextNum++;
      candidate = `TK${String(nextNum).padStart(3, '0')}`;
    }

    const updated = await User.findOneAndUpdate(
      {
        _id: thekedarUser._id,
        $or: [{ thekedarCode: { $exists: false } }, { thekedarCode: null }, { thekedarCode: '' }],
      },
      { $set: { thekedarCode: candidate } },
      { new: true }
    );

    return updated?.thekedarCode || candidate;
  });
};

/**
 * Atomically allocates the next quotation number for a specific Thekedar.
 * Format: FC-TK[THEKEDAR_CODE]-QTN-[SEQUENCE] (e.g. FC-TK001-QTN-0001)
 */
export const allocateNextQuotationNumber = async (thekedarId, thekedarCode) => {
  return withDuplicateRetry(async () => {
    const seqDoc = await QuotationSequence.findOneAndUpdate(
      { thekedarId },
      {
        $inc: { lastSequence: 1 },
        $setOnInsert: { thekedarCode },
      },
      { new: true, upsert: true }
    );

    let sequenceNumber = seqDoc.lastSequence;
    let candidate = `FC-${thekedarCode}-QTN-${String(sequenceNumber).padStart(4, '0')}`;

    // Defensive check: if candidate already exists in Quotation collection, advance until free
    while (await Quotation.exists({ quotationNumber: candidate })) {
      const advanced = await QuotationSequence.findOneAndUpdate(
        { thekedarId },
        { $inc: { lastSequence: 1 } },
        { new: true }
      );
      sequenceNumber = advanced.lastSequence;
      candidate = `FC-${thekedarCode}-QTN-${String(sequenceNumber).padStart(4, '0')}`;
    }

    return candidate;
  });
};

/**
 * Recalculates item totals and grand total securely on the backend.
 * Never trusts client-submitted totals.
 * Supported units are strictly 'SQ FEET' and 'PCS'.
 */
export const calculateQuotationTotals = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new BadRequestError('At least one item is required in the quotation');
  }

  const calculatedItems = items.map((item, idx) => {
    const particular = (item.particular || '').trim();
    if (!particular) {
      throw new BadRequestError(`Item #${idx + 1}: Item description is required`);
    }

    const quantity = Number(item.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      throw new BadRequestError(`Item #${idx + 1}: Quantity must be greater than zero`);
    }

    const unit = (item.unit || '').trim().toUpperCase();
    if (!['SQ FEET', 'PCS'].includes(unit)) {
      throw new BadRequestError(`Item #${idx + 1}: Unit must be either 'SQ FEET' or 'PCS'`);
    }

    const rate = Number(item.rate);
    if (isNaN(rate) || rate < 0) {
      throw new BadRequestError(`Item #${idx + 1}: Rate must be zero or greater`);
    }

    // Decimal-safe rounding to 2 decimal places
    const total = Math.round((quantity * rate + Number.EPSILON) * 100) / 100;

    return {
      particular,
      quantity,
      unit,
      rate,
      total,
    };
  });

  const grandTotal = Math.round(
    calculatedItems.reduce((acc, item) => acc + item.total, 0) * 100
  ) / 100;

  return { calculatedItems, grandTotal };
};

/**
 * Create a new quotation for an authenticated Thekedar or Owner.
 */
export const createQuotation = async ({ thekedarUser, data }) => {
  const thekedarCode = await ensureThekedarCode(thekedarUser);
  const quotationNumber = await allocateNextQuotationNumber(thekedarUser._id, thekedarCode);

  const { calculatedItems, grandTotal } = calculateQuotationTotals(data.items);

  const now = new Date();
  const formattedDate = formatIndianDate(now);

  const quotation = await Quotation.create({
    thekedarId: thekedarUser._id,
    thekedarCode,
    quotationNumber,
    thekedar: {
      businessName: data.thekedar?.businessName?.trim() || thekedarUser.businessName || thekedarUser.name,
      phone: data.thekedar?.phone?.trim() || thekedarUser.phone,
      logoUrl: data.thekedar?.logoUrl?.trim() || thekedarUser.logoUrl || '',
    },
    customer: {
      name: data.customer.name.trim(),
      phone: data.customer.phone ? data.customer.phone.trim() : '',
      address: data.customer.address ? data.customer.address.trim() : '',
    },
    project: {
      name: data.project.name.trim(),
    },
    items: calculatedItems,
    grandTotal,
    quotationDate: now,
    formattedDate,
    termsAndConditions:
      Array.isArray(data.termsAndConditions) && data.termsAndConditions.length > 0
        ? data.termsAndConditions
        : DEFAULT_TERMS_AND_CONDITIONS,
    status: data.status || 'DRAFT',
  });

  return quotation;
};

/**
 * List quotations with search, filtering, and pagination.
 * If userRole is OWNER, shows all quotations; otherwise strictly scoped to thekedarId.
 */
export const listQuotations = async ({
  thekedarId,
  userRole,
  page = 1,
  limit = 20,
  search = '',
  sortBy = 'createdAt',
  sortOrder = 'desc',
  startDate,
  endDate,
  status,
}) => {
  const filter = userRole === 'OWNER' ? {} : { thekedarId };

  if (search && search.trim()) {
    const s = search.trim();
    filter.$or = [
      { quotationNumber: { $regex: s, $options: 'i' } },
      { 'customer.name': { $regex: s, $options: 'i' } },
      { 'project.name': { $regex: s, $options: 'i' } },
    ];
  }

  if (status && status.trim()) {
    filter.status = status.trim().toUpperCase();
  }

  if (startDate || endDate) {
    filter.quotationDate = {};
    if (startDate) {
      filter.quotationDate.$gte = new Date(startDate);
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      filter.quotationDate.$lte = e;
    }
  }

  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (p - 1) * l;

  const validSortFields = ['createdAt', 'quotationDate', 'grandTotal', 'quotationNumber', 'customer.name'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  const [quotations, total] = await Promise.all([
    Quotation.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(l)
      .lean(),
    Quotation.countDocuments(filter),
  ]);

  return {
    quotations,
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages: Math.ceil(total / l) || 1,
    },
  };
};

/**
 * Get a single quotation by ID.
 * Strict privacy: returns generic 404 if not found or owned by another Thekedar.
 */
export const getQuotationById = async ({ quotationId, thekedarId, userRole }) => {
  const query = userRole === 'OWNER' ? { _id: quotationId } : { _id: quotationId, thekedarId };
  const quotation = await Quotation.findOne(query);
  if (!quotation) {
    throw new NotFoundError('Quotation not found');
  }
  return quotation;
};

/**
 * Update an existing quotation.
 * Preserves quotationNumber, quotationDate, and thekedarCode.
 * Recalculates items and grandTotal.
 * Strict privacy: returns 404 if not owned.
 */
export const updateQuotation = async ({ quotationId, thekedarId, userRole, data, thekedarUser }) => {
  const query = userRole === 'OWNER' ? { _id: quotationId } : { _id: quotationId, thekedarId };
  const quotation = await Quotation.findOne(query);
  if (!quotation) {
    throw new NotFoundError('Quotation not found');
  }

  if (data.customer) {
    if (data.customer.name !== undefined) quotation.customer.name = data.customer.name.trim();
    if (data.customer.phone !== undefined) quotation.customer.phone = data.customer.phone.trim();
    if (data.customer.address !== undefined) quotation.customer.address = data.customer.address.trim();
  }

  if (data.project && data.project.name !== undefined) {
    quotation.project.name = data.project.name.trim();
  }

  if (data.thekedar) {
    if (data.thekedar.businessName !== undefined) {
      quotation.thekedar.businessName = data.thekedar.businessName.trim();
    }
    if (data.thekedar.phone !== undefined) {
      quotation.thekedar.phone = data.thekedar.phone.trim();
    }
    if (data.thekedar.logoUrl !== undefined) {
      quotation.thekedar.logoUrl = data.thekedar.logoUrl.trim();
    }
  }

  if (data.items && Array.isArray(data.items)) {
    const { calculatedItems, grandTotal } = calculateQuotationTotals(data.items);
    quotation.items = calculatedItems;
    quotation.grandTotal = grandTotal;
  }

  if (data.termsAndConditions && Array.isArray(data.termsAndConditions)) {
    quotation.termsAndConditions = data.termsAndConditions;
  }

  if (data.status) {
    quotation.status = data.status;
  }

  await quotation.save();
  return quotation;
};

/**
 * Duplicate an existing quotation.
 * Copies customer, project, items, and terms.
 * Generates a brand new unique quotationNumber and uses current server date.
 * Strict privacy: returns 404 if source quotation not owned.
 */
export const duplicateQuotation = async ({ quotationId, thekedarUser, userRole }) => {
  const query = userRole === 'OWNER' ? { _id: quotationId } : { _id: quotationId, thekedarId: thekedarUser._id };
  const source = await Quotation.findOne(query);
  if (!source) {
    throw new NotFoundError('Quotation not found');
  }

  const thekedarCode = await ensureThekedarCode(thekedarUser);
  const quotationNumber = await allocateNextQuotationNumber(thekedarUser._id, thekedarCode);

  const now = new Date();
  const formattedDate = formatIndianDate(now);

  const duplicated = await Quotation.create({
    thekedarId: thekedarUser._id,
    thekedarCode,
    quotationNumber,
    thekedar: {
      businessName: source.thekedar.businessName || thekedarUser.businessName || thekedarUser.name,
      phone: source.thekedar.phone || thekedarUser.phone,
      logoUrl: source.thekedar.logoUrl || thekedarUser.logoUrl || '',
    },
    customer: {
      name: source.customer.name,
      phone: source.customer.phone || '',
      address: source.customer.address || '',
    },
    project: {
      name: source.project.name,
    },
    items: source.items.map((i) => ({
      particular: i.particular,
      quantity: i.quantity,
      unit: i.unit,
      rate: i.rate,
      total: i.total,
    })),
    grandTotal: source.grandTotal,
    quotationDate: now,
    formattedDate,
    termsAndConditions: source.termsAndConditions || DEFAULT_TERMS_AND_CONDITIONS,
    status: 'DRAFT',
  });

  return duplicated;
};

/**
 * Delete a quotation.
 * Does NOT reset or decrement sequence counter. Number is retired permanently.
 * Strict privacy: returns 404 if not owned.
 */
export const deleteQuotation = async ({ quotationId, thekedarId, userRole }) => {
  const query = userRole === 'OWNER' ? { _id: quotationId } : { _id: quotationId, thekedarId };
  const deleted = await Quotation.findOneAndDelete(query);
  if (!deleted) {
    throw new NotFoundError('Quotation not found');
  }
  return { success: true, message: 'Quotation deleted successfully' };
};
