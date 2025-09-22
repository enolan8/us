const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { expect } = require('chai');

describe('Export random and selectors', function() {
  let dom;
  let window;
  let document;

  before(async function() {
    const indexPath = path.resolve(__dirname, '..', 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');

    dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
    window = dom.window;
    document = window.document;

    // 等待脚本加载
    await new Promise((resolve) => {
      if (document.readyState === 'complete') return resolve();
      document.addEventListener('DOMContentLoaded', () => setTimeout(resolve, 50));
    });

    // 等待额外的脚本初始化（index.html 内的 window.onload）
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  after(function() {
    if (dom) dom.window.close();
  });

  it('getRandomUnassignedNumbers should return unique items and respect count', function() {
    const w = window;

    // 创建模拟数据（部分已分配，部分未分配）
    w.numberList = [];
    for (let i = 1; i <= 200; i++) {
      w.numberList.push({ id: i, phoneNumber: `+1-200-000-${String(i).padStart(4, '0')}`, assignee: i % 3 === 0 ? 'A' : '' });
    }

    const results = w.getRandomUnassignedNumbers(50);
    expect(results).to.be.an('array');
    expect(results.length).to.be.at.most(50);

    // 检查唯一性
    const ids = results.map(r => r.id);
    const uniqueIds = Array.from(new Set(ids));
    expect(uniqueIds.length).to.equal(ids.length);

    // 多次调用，概率上应能取得不同组合（非确定性测试，但简单检查）
    const results2 = w.getRandomUnassignedNumbers(50);
    const ids2 = results2.map(r => r.id);
    // 允许部分重合，但整体不完全相同
    const identical = ids.every((v, idx) => v === ids2[idx]);
    expect(identical).to.be.false;
  });

  it('updatePersonSelectors should populate exportAssignTo select', function() {
    const w = window;
    // 清空人员并添加
    w.personList = [
      { id: 1, name: 'Team X', purpose: '', remark: '', displayName: 'Team X' },
      { id: 2, name: 'Team Y', purpose: '', remark: '', displayName: 'Team Y' }
    ];

    // 创建 select element if missing
    let exportAssignSelect = document.getElementById('exportAssignTo');
    expect(exportAssignSelect).to.exist;
    exportAssignSelect.innerHTML = '<option value="">导出时不分配</option>';

    // 调用更新
    w.updatePersonSelectors();

    // 选项应包含 Team X 和 Team Y
    const options = Array.from(exportAssignSelect.querySelectorAll('option')).map(o => o.value);
    expect(options).to.include('Team X');
    expect(options).to.include('Team Y');
  });
});
