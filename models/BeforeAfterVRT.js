import mongoose from 'mongoose';

const beforeAfterVRTSchema = new mongoose.Schema({
    automationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Automation',
        required: true,
        index: true
    },
    
    siteUrl: {
        type: String,
        required: true
    },
    
    projectName: {
        type: String,
        required: true
    },
    
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    
    pagesData: [{
        weblink: {
            type: String,
            required: true
        },
        before: {
            url: {
                type: String,
                default: null
            },
            publicId: {
                type: String,
                default: null
            }
        },
        after: {
            url: {
                type: String,
                default: null
            },
            publicId: {
                type: String,
                default: null
            }
        },
        diff: {
            url: { type: String, default: null },
            publicId: { type: String, default: null },
            percent: { type: Number, default: null },
            status: { type: String, enum: ['pass', 'fail', 'error', null], default: null },
            error: { type: String, default: null }
        }
    }],
    
    postsData: [{
        weblink: {
            type: String,
            required: true
        },
        before: {
            url: {
                type: String,
                default: null
            },
            publicId: {
                type: String,
                default: null
            }
        },
        after: {
            url: {
                type: String,
                default: null
            },
            publicId: {
                type: String,
                default: null
            }
        },
        diff: {
            url: { type: String, default: null },
            publicId: { type: String, default: null },
            percent: { type: Number, default: null },
            status: { type: String, enum: ['pass', 'fail', 'error', null], default: null },
            error: { type: String, default: null }
        }
    }],
    
    status: {
        type: String,
        enum: ['before_pending', 'before_completed', 'after_pending', 'after_completed', 'comparison_completed'],
        default: 'before_pending'
    },
    
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    beforeCompletedAt: {
        type: Date,
        default: null
    },
    
    afterCompletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for efficient querying
beforeAfterVRTSchema.index({ automationId: 1 });
beforeAfterVRTSchema.index({ projectId: 1 });

const BeforeAfterVRT = mongoose.models.BeforeAfterVRT || mongoose.model('BeforeAfterVRT', beforeAfterVRTSchema);

export default BeforeAfterVRT; 