import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  stagingSiteUrl: { type: String, default: null },
  liveSiteUrl: { type: String, default: null },
  stagingSiteMap: {
    pageSitemapUrl: { type: String, default: null },
    postSitemapUrl: { type: String, default: null }
  },
  liveSiteMap: {
    pageSitemapUrl: { type: String, default: null },
    postSitemapUrl: { type: String, default: null }
  },
  
  // Extracted URLs from sitemaps
  stagingSiteUrls: {
    pages: [{ type: String }],
    posts: [{ type: String }],
    lastFetched: { type: Date }
  },
  liveSiteUrls: {
    pages: [{ type: String }],
    posts: [{ type: String }],
    lastFetched: { type: Date }
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Virtual to get related automations
ProjectSchema.virtual('automations', {
  ref: 'Automation',
  localField: '_id',
  foreignField: 'projectId'
});

// Virtual to get automation count
ProjectSchema.virtual('automationCount', {
  ref: 'Automation',
  localField: '_id',
  foreignField: 'projectId',
  count: true
});

// Virtual to get related site states (through automations)
ProjectSchema.virtual('siteStates', {
  ref: 'SiteState',
  localField: '_id',
  foreignField: 'automationId',
  match: function() {
    // This will be populated through automations
    return {};
  }
});

// Virtual to get related test results (through automations)
ProjectSchema.virtual('testResults', {
  ref: 'TestResult',
  localField: '_id',
  foreignField: 'automationId',
  match: function() {
    // This will be populated through automations
    return {};
  }
});

ProjectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure virtual fields are serialized
ProjectSchema.set('toJSON', { virtuals: true });
ProjectSchema.set('toObject', { virtuals: true });

// Index for efficient queries
ProjectSchema.index({ name: 1 });
ProjectSchema.index({ stagingSiteUrl: 1 });
ProjectSchema.index({ liveSiteUrl: 1 });
ProjectSchema.index({ 'stagingSiteMap.pageSitemapUrl': 1 });
ProjectSchema.index({ 'stagingSiteMap.postSitemapUrl': 1 });
ProjectSchema.index({ 'liveSiteMap.pageSitemapUrl': 1 });
ProjectSchema.index({ 'liveSiteMap.postSitemapUrl': 1 });
ProjectSchema.index({ 'stagingSiteUrls.lastFetched': -1 });
ProjectSchema.index({ 'liveSiteUrls.lastFetched': -1 });

// Replace the export with the safe pattern to avoid OverwriteModelError
export default mongoose.models.Project || mongoose.model('Project', ProjectSchema); 