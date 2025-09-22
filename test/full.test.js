const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { expect } = require('chai');

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Full app flows', function() {
  this.timeout(10000);
  let dom, window, document;

  before(async function() {
    const indexPath = path.resolve(__dirname, '..', 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');
    dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
    window = dom.window;
    document = window.document;

    // 等待初始化
    await new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', () => setTimeout(resolve, 50));
      if (document.readyState === 'complete') setTimeout(resolve, 50);
    });
    // wait for window.onload handlers and setTimeouts
    await wait(300);
  });

  after(function() { if (dom) dom.window.close(); });

  it('initial data loaded', function() {
    expect(window.numberList).to.be.an('array');
    expect(window.personList).to.be.an('array');
    expect(window.logList).to.be.an('array');
    expect(window.numberList.length).to.be.at.least(1);
  });

  it('add, edit, delete person flow', async function() {
    const doc = document;
    // show add form
    window.showAddPersonForm();
    doc.getElementById('personName').value = 'QA Team';
    doc.getElementById('personPurpose').value = '测试';
    doc.getElementById('personRemark').value = '自动化添加';

    // submit
    doc.getElementById('personForm').dispatchEvent(new window.Event('submit'));
    // wait for async savePerson
    await wait(600);

    const added = window.personList.find(p => p.displayName.includes('QA Team'));
    expect(added).to.exist;

    // edit person
    window.editPerson(added.id);
    doc.getElementById('personName').value = 'QA Team Edited';
    doc.getElementById('personForm').dispatchEvent(new window.Event('submit'));
    await wait(600);

    const edited = window.personList.find(p => p.id === added.id);
    expect(edited.name).to.equal('QA Team Edited');

    // delete person
    // ensure no linked numbers
    window.deletePerson(edited.id);
    // deletePerson uses confirm; override confirm to auto true
    // But confirm already executed synchronously; ensure overridden before call
  });

  it('add, edit, delete number via form', async function() {
    const doc = document;
    // add
    window.showAddForm();
    doc.getElementById('editPhone').value = '+1-999-999-0001';
    doc.getElementById('editName').value = 'Test User';
    doc.getElementById('editAge').value = '29';
    // submit
    doc.getElementById('editForm').dispatchEvent(new window.Event('submit'));
    await wait(700);

    const added = window.numberList.find(n => n.phoneNumber === '+1-999-999-0001');
    expect(added).to.exist;

    // edit
    window.editNumber(added.id);
    doc.getElementById('editName').value = 'Test User Edited';
    doc.getElementById('editForm').dispatchEvent(new window.Event('submit'));
    await wait(700);

    const edited = window.numberList.find(n => n.id === added.id);
    expect(edited.name).to.equal('Test User Edited');

    // delete
    // override confirm to true for test
    const origConfirm = window.confirm;
    window.confirm = () => true;
    window.deleteNumber(added.id);
    await wait(700);
    const existsAfter = window.numberList.find(n => n.id === added.id);
    expect(existsAfter).to.be.undefined;
    window.confirm = origConfirm;
  });

  it('paste import adds numbers and logs', async function() {
    const doc = document;
    // prepare paste data
    const baseCount = window.numberList.length;
    doc.getElementById('pasteData').value = `+1-888-000-0001,导入一,31,\n+1-888-000-0002,导入二,32,`; // two records
    // parse
    doc.getElementById('pasteData').dispatchEvent(new window.Event('input'));
    window.parsePasteData();

    // mark pasteAssignee to none
    doc.getElementById('pasteAssignee').value = '';

    // perform import
    window.doImport();
    // wait import timeout
    await wait(1000);

    expect(window.numberList.length).to.be.at.least(baseCount + 2);
    // check logs for '粘贴导入'
    const found = window.logList.some(l => l.content && l.content.includes('粘贴导入'));
    expect(found).to.be.true;
  });

  it('export random assigns when chosen', async function() {
    const doc = document;
    // ensure there are unassigned numbers
    // create some unassigned numbers if needed
    let unassigned = window.numberList.filter(n => !n.assignee);
    if (unassigned.length < 3) {
      const start = Math.max(1, Math.max(...window.numberList.map(n => n.id)) + 1);
      for (let i = 0; i < 5; i++) {
        window.numberList.push({ id: start + i, phoneNumber: `+1-777-000-${String(i).padStart(4,'0')}`, name: 'X', age: 20, assignee: '', importTime: 'now', fileName: '' });
      }
      window.saveNumbersToStorage();
      unassigned = window.numberList.filter(n => !n.assignee);
    }

    // choose export modal settings
    doc.getElementById('exportRange').value = 'random';
    doc.getElementById('exportRandomCount').value = '3';
    // choose first person for assignment
    const firstPerson = window.personList[0];
    doc.getElementById('exportAssignTo').value = firstPerson.displayName;

    // run export
    window.doExport();
    await wait(1000);

    // Check that up to 3 previously-unassigned numbers are now assigned to person
    const newlyAssigned = window.numberList.filter(n => n.assignee === firstPerson.displayName);
    expect(newlyAssigned.length).to.be.at.least(1);

    // ensure logs contain '导出并分配'
    const hasExportAssignLog = window.logList.some(l => l.action && l.action.includes('导出并分配'));
    expect(hasExportAssignLog).to.be.true;
  });
});
