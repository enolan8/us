# 美国号码管理系统 - 架构概览

这是根据你提供的思路整理的简洁架构说明，供进一步实现或迁移到 Python/PyQt + MongoDB 时参考。

界面层（建议：PyQt6 或 Web 前端）
- 页面管理：QStackedWidget（或单页多视图）
- 卡片布局：GlassCard + QGridLayout，显示号码/状态/地区/Owner，视觉上使用半透明/模糊/圆角
- 操作面板：导入/导出/分配/回收/筛选 控件

逻辑层（建议：Python）
- 号码解析： phonenumbers 库，统一 10 位存储格式，解析类型/地区/运营商
- 分配/回收逻辑：支持单个与批量分配；记录 owner 与时间；回收则清空 owner 并修改 status
- 导入/导出：支持 CSV/Excel/TXT/粘贴；内存去重、重复统计；在后台线程处理并显示进度

数据层（MongoDB / 本地）
- 主要字段：
  - phone (唯一)
  - raw_input
  - status
  - owner
  - region/type
  - import_time
  - notes
- 索引/批量操作：
  - 唯一索引 phone
  - 复合索引 status+owner
  - 使用 insert_many/update_many/bulk_write 优化批量导入/更新

性能 & 优化
- 内存去重 + 缓存
- 分页加载/延迟渲染
- 异步线程/线程池（导入/导出/备份）
- 批量操作合并与写入合并
- 数据分片/索引优化

日志与备份
- 操作日志（导入/分配/回收）
- 异步备份（CSV/JSON/压缩）

迁移/实施建议
1. 将 UI 与逻辑解耦：前端渲染仅负责视图与事件，逻辑层封装为可测试的 Python 模块
2. 导入流程在后台线程执行，写入数据库前先进行内存去重，减少重复写入
3. 对大量数据操作使用批量写入和索引，MongoDB 上使用唯一索引防止重复插入
4. 提供导出/备份计划并异步执行，避免阻塞主线程
