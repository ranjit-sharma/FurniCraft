import mongoose from 'mongoose';

export const DEFAULT_TERMS_AND_CONDITIONS = [
  'All work will be done as per the agreed design, size, and details.',
  'Materials, colours, and fittings will be used as agreed with the customer.',
  'Any extra work or changes will cost extra.',
  'Extra charges will be discussed with the customer before starting the work.',
  'Payments must be made as agreed between the customer and the contractor.',
];

const quotationItemSchema = new mongoose.Schema(
  {
    particular: {
      type: String,
      required: [true, 'Item particular is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.0001, 'Quantity must be greater than zero'],
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      enum: {
        values: ['SQ FEET', 'PCS'],
        message: 'Unit must be either SQ FEET or PCS',
      },
    },
    rate: {
      type: Number,
      required: [true, 'Rate is required'],
      min: [0, 'Rate cannot be negative'],
    },
    total: {
      type: Number,
      required: [true, 'Item total is required'],
      min: [0, 'Item total cannot be negative'],
    },
  },
  { _id: true }
);

const quotationSchema = new mongoose.Schema(
  {
    thekedarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Thekedar ID is required'],
      index: true,
    },
    thekedarCode: {
      type: String,
      required: [true, 'Thekedar code is required'],
      trim: true,
      index: true,
    },
    quotationNumber: {
      type: String,
      required: [true, 'Quotation number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    thekedar: {
      businessName: {
        type: String,
        trim: true,
        default: '',
      },
      phone: {
        type: String,
        trim: true,
        default: '',
      },
      logoUrl: {
        type: String,
        trim: true,
        default: '',
      },
    },
    customer: {
      name: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
        default: '',
      },
      address: {
        type: String,
        trim: true,
        default: '',
      },
    },
    project: {
      name: {
        type: String,
        required: [true, 'Project name is required'],
        trim: true,
      },
      // Note: project.description is strictly omitted per specification
    },
    items: {
      type: [quotationItemSchema],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: 'At least one quotation item is required',
      },
    },
    grandTotal: {
      type: Number,
      required: [true, 'Grand total is required'],
      min: [0, 'Grand total cannot be negative'],
    },
    quotationDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    formattedDate: {
      type: String,
      required: true,
    },
    termsAndConditions: {
      type: [String],
      default: DEFAULT_TERMS_AND_CONDITIONS,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED'],
      default: 'DRAFT',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for tenant-scoped lookups and search
quotationSchema.index({ thekedarId: 1, createdAt: -1 });
quotationSchema.index({ thekedarId: 1, quotationNumber: 1 });
quotationSchema.index({ thekedarId: 1, 'customer.name': 1 });

export const Quotation = mongoose.model('Quotation', quotationSchema);
