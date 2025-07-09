/**
 * Generates an HTML email template for automation reports
 * @param {Object} params
 * @param {string} params.projectName - Name of the project
 * @param {string} params.siteUrl - URL of the site
 * @param {string} params.status - Status of the report
 * @param {number|string} params.duration - Duration in seconds
 * @param {string} params.reportUrl - Link to the full report
 * @param {Object} params.vrtDiffSummary - Summary of VRT results
 * @param {Array} params.vrtDiffResults - Array of VRT results
 * @returns {string} HTML string
 */
export function generateReportEmailHTML({ projectName, siteUrl, status, duration, reportUrl, vrtDiffSummary, vrtDiffResults }) {
  // VRT summary and failed entries
  let vrtSection = '';
  if (vrtDiffSummary && vrtDiffResults && vrtDiffResults.length > 0) {
    vrtSection += `<h3 style="color:#2d3748;margin-top:32px;">Visual Regression Test (VRT) Results</h3>`;
    vrtSection += `<div style="margin-bottom:12px;">Total: <b>${vrtDiffSummary.total}</b> &nbsp; <span style='color:#38a169'>Passed: <b>${vrtDiffSummary.passed}</b></span> &nbsp; <span style='color:#e53e3e'>Failed: <b>${vrtDiffSummary.failed}</b></span></div>`;
    const failed = vrtDiffResults.filter(r => r.status === 'fail');
    if (failed.length > 0) {
      vrtSection += `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;">
        <thead><tr style="background:#f1f5f9;"><th style="padding:6px 8px;">Page</th><th style="padding:6px 8px;">Before</th><th style="padding:6px 8px;">After</th><th style="padding:6px 8px;">Diff</th><th style="padding:6px 8px;">Diff %</th></tr></thead>
        <tbody>`;
      for (const entry of failed) {
        vrtSection += `<tr>
          <td style="padding:6px 8px;word-break:break-all;"><a href="${entry.weblink}" style="color:#3182ce;">${entry.weblink}</a></td>
          <td style="padding:6px 8px;"><a href="${entry.beforeUrl}">Before</a></td>
          <td style="padding:6px 8px;"><a href="${entry.afterUrl}">After</a></td>
          <td style="padding:6px 8px;"><a href="${entry.diffUrl}">Diff</a></td>
          <td style="padding:6px 8px;">${entry.diffPercent?.toFixed(2) ?? '-'}</td>
        </tr>`;
      }
      vrtSection += `</tbody></table>`;
    } else {
      vrtSection += `<div style='color:#38a169;margin-top:8px;'>All pages passed visual regression test.</div>`;
    }
  }
  return `
    <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
      <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); padding: 32px;">
        <h2 style="color: #2d3748;">🚀 Automation Report Generated</h2>
        <table style="width: 100%; margin-top: 24px; margin-bottom: 24px; font-size: 16px;">
          <tr>
            <td style="font-weight: bold; color: #4a5568;">Project:</td>
            <td>${projectName}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #4a5568;">Site:</td>
            <td><a href="${siteUrl}" style="color: #3182ce; text-decoration: none;">${siteUrl}</a></td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #4a5568;">Status:</td>
            <td><span style="color: ${status === 'completed' ? '#38a169' : '#e53e3e'}; font-weight: bold;">${status}</span></td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #4a5568;">Duration:</td>
            <td>${duration}s</td>
          </tr>
        </table>
        <a href="${reportUrl}" style="display: inline-block; background: #3182ce; color: #fff; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold;">View Full Report</a>
        ${vrtSection}
        <p style="margin-top: 32px; color: #a0aec0; font-size: 13px;">This is an automated message from WDM TechOps Platform.</p>
      </div>
    </div>
  `;
} 