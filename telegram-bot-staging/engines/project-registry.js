// ═══════════════════════════════════════════════════════════════
//  PHC DEVELOPER PROJECT REGISTRY ENGINE
//  Manages Developer Price Lists (TS7, etc.), Unit Statuses,
//  and CSV/Excel Data Ingestion
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const PROJECTS_DIR = path.join(__dirname, '..', 'data', 'projects');

function getProject(projectId = 'time-square-7') {
  const filePath = path.join(PROJECTS_DIR, `${projectId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveProject(project) {
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  }
  const filePath = path.join(PROJECTS_DIR, `${project.projectId}.json`);
  project.provenance = project.provenance || {};
  project.provenance.lastUpdated = new Date().toISOString().split('T')[0];
  fs.writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf8');
  return true;
}

function updateUnitStatus(projectId, unitCode, newStatus) {
  const project = getProject(projectId);
  if (!project) return { success: false, error: 'Project not found' };

  let found = false;
  project.unitTypes.forEach(t => {
    t.availableUnits.forEach(u => {
      if (u.unitCode.toLowerCase() === unitCode.toLowerCase()) {
        u.status = newStatus;
        if (newStatus === 'sold') {
          u.soldAt = new Date().toISOString();
        } else {
          delete u.soldAt;
        }
        found = true;
      }
    });
  });

  if (!found) return { success: false, error: `Unit ${unitCode} not found` };

  saveProject(project);
  return { success: true, message: `Unit ${unitCode} updated to ${newStatus}` };
}

/**
 * Ingests a CSV string of units into the project
 * Expected headers: UnitCode, Floor, Stack, ListPrice, NetPrice, Orientation, Status
 */
function ingestCsvPriceList(projectId, csvContent) {
  const project = getProject(projectId);
  if (!project) return { success: false, error: 'Project not found' };

  const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { success: false, error: 'CSV is empty or missing data rows' };

  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const codeIdx = header.findIndex(h => h.includes('unit') || h.includes('code'));
  const floorIdx = header.findIndex(h => h.includes('floor'));
  const listIdx = header.findIndex(h => h.includes('list') || h.includes('price'));
  const netIdx = header.findIndex(h => h.includes('net'));
  const oriIdx = header.findIndex(h => h.includes('orient') || h.includes('view'));
  const statusIdx = header.findIndex(h => h.includes('status'));

  if (codeIdx === -1 || listIdx === -1) {
    return { success: false, error: 'CSV must contain at least "UnitCode" and "ListPrice" columns' };
  }

  let updatedCount = 0;
  let addedCount = 0;
  const duplexType = project.unitTypes[0];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    const unitCode = cols[codeIdx];
    if (!unitCode) continue;

    const listPrice = parseInt(cols[listIdx].replace(/[^0-9]/g, ''), 10) || 0;
    const netPrice = netIdx !== -1 && cols[netIdx]
      ? parseInt(cols[netIdx].replace(/[^0-9]/g, ''), 10)
      : Math.round(listPrice * 0.88 - 3000);

    const floor = floorIdx !== -1 ? parseInt(cols[floorIdx], 10) || parseInt(unitCode, 10) : parseInt(unitCode, 10);
    const orientation = oriIdx !== -1 ? cols[oriIdx] : (unitCode.endsWith('1') ? 'Outer' : 'Inner');
    const status = statusIdx !== -1 && cols[statusIdx].toLowerCase().includes('sold') ? 'sold' : 'available';

    // Find existing unit or add new
    let existing = duplexType.availableUnits.find(u => u.unitCode.toLowerCase() === unitCode.toLowerCase());
    if (existing) {
      existing.listPrice = listPrice;
      existing.netPrice = netPrice;
      existing.status = status;
      if (orientation) existing.orientation = orientation;
      updatedCount++;
    } else {
      duplexType.availableUnits.push({
        unitCode,
        floor,
        column: unitCode.replace(/[0-9]/g, ''),
        listPrice,
        netPrice,
        orientation,
        status
      });
      addedCount++;
    }
  }

  saveProject(project);
  return {
    success: true,
    message: `Processed ${lines.length - 1} rows (${updatedCount} updated, ${addedCount} added)`
  };
}

module.exports = {
  getProject,
  saveProject,
  updateUnitStatus,
  ingestCsvPriceList
};
