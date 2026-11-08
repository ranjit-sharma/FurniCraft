import * as quotationService from '../services/quotationService.js';
import { generateQuotationPdfBuffer } from '../services/quotationPdfService.js';
import { recordAuditLog } from '../utils/auditLog.js';

export const createQuotation = async (req, res, next) => {
  try {
    const quotation = await quotationService.createQuotation({
      thekedarUser: req.user,
      data: req.body,
    });

    await recordAuditLog({
      req,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'QUOTATION_CREATED',
      targetType: 'Quotation',
      targetId: quotation._id,
      newValues: {
        quotationNumber: quotation.quotationNumber,
        thekedarCode: quotation.thekedarCode,
        customerName: quotation.customer.name,
        projectName: quotation.project.name,
        grandTotal: quotation.grandTotal,
      },
    });

    res.status(201).json({
      status: 'success',
      message: 'Quotation created successfully',
      data: { quotation },
    });
  } catch (error) {
    next(error);
  }
};

export const listQuotations = async (req, res, next) => {
  try {
    const { page, limit, search, sortBy, sortOrder, startDate, endDate, status } = req.query;

    const result = await quotationService.listQuotations({
      thekedarId: req.user._id,
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      startDate,
      endDate,
      status,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getQuotationById = async (req, res, next) => {
  try {
    const quotation = await quotationService.getQuotationById({
      quotationId: req.params.id,
      thekedarId: req.user._id,
    });

    res.status(200).json({
      status: 'success',
      data: { quotation },
    });
  } catch (error) {
    next(error);
  }
};

export const updateQuotation = async (req, res, next) => {
  try {
    const quotation = await quotationService.updateQuotation({
      quotationId: req.params.id,
      thekedarId: req.user._id,
      data: req.body,
      thekedarUser: req.user,
    });

    await recordAuditLog({
      req,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'QUOTATION_UPDATED',
      targetType: 'Quotation',
      targetId: quotation._id,
      newValues: {
        quotationNumber: quotation.quotationNumber,
        grandTotal: quotation.grandTotal,
        customerName: quotation.customer.name,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Quotation updated successfully',
      data: { quotation },
    });
  } catch (error) {
    next(error);
  }
};

export const duplicateQuotation = async (req, res, next) => {
  try {
    const quotation = await quotationService.duplicateQuotation({
      quotationId: req.params.id,
      thekedarUser: req.user,
    });

    await recordAuditLog({
      req,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'QUOTATION_DUPLICATED',
      targetType: 'Quotation',
      targetId: quotation._id,
      newValues: {
        quotationNumber: quotation.quotationNumber,
        sourceQuotationId: req.params.id,
        grandTotal: quotation.grandTotal,
      },
    });

    res.status(201).json({
      status: 'success',
      message: 'Quotation duplicated successfully',
      data: { quotation },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteQuotation = async (req, res, next) => {
  try {
    const result = await quotationService.deleteQuotation({
      quotationId: req.params.id,
      thekedarId: req.user._id,
    });

    await recordAuditLog({
      req,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'QUOTATION_DELETED',
      targetType: 'Quotation',
      targetId: req.params.id,
    });

    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadQuotationPdf = async (req, res, next) => {
  try {
    const quotation = await quotationService.getQuotationById({
      quotationId: req.params.id,
      thekedarId: req.user._id,
    });

    const pdfBuffer = await generateQuotationPdfBuffer(quotation);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${quotation.quotationNumber}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

export const getQuotationInitialData = async (req, res, next) => {
  try {
    const thekedarCode = await quotationService.ensureThekedarCode(req.user);
    const currentDate = quotationService.formatIndianDate(new Date());

    res.status(200).json({
      status: 'success',
      data: {
        thekedar: {
          businessName: req.user.businessName || req.user.name || '',
          name: req.user.name || '',
          phone: req.user.phone || '',
          thekedarCode,
          logoUrl: req.user.logoUrl || '',
        },
        currentDate,
        defaultTerms: quotationService.DEFAULT_TERMS_AND_CONDITIONS || [
          'All work will be done as per the agreed design, size, and details.',
          'Materials, colours, and fittings will be used as agreed with the customer.',
          'Any extra work or changes will cost extra.',
          'Extra charges will be discussed with the customer before starting the work.',
          'Payments must be made as agreed between the customer and the contractor.',
        ],
      },
    });
  } catch (error) {
    next(error);
  }
};
