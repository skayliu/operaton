#!/usr/bin/env node
/**
 * Fills the properties-panel half of the canvas dictionary (zh-CN only).
 *
 *   node tools/modeler-i18n/zh-cn.mjs           write
 *   node tools/modeler-i18n/zh-cn.mjs --check   report only, exit 1 on drift
 *
 * Why this is a separate file from `fill_modeler_dicts.mjs`: that one is driven
 * by `en-US/modeler.json` and the palette/context-pad/replace-menu keys. The
 * properties panel is a different surface — 358 keys, most of them full
 * sentences of Camunda documentation text — and it is only translated for
 * zh-CN for now, so it cannot live in the English source file (which would
 * then demand a translation for every language).
 *
 * Three keys in `tools/modeler_keys.json` are extractor artefacts: the scanner
 * read a template literal before `${...}` was evaluated, so the recorded "key"
 * is never what `translate` receives at runtime. They are listed under
 * `EXTRACTOR_ARTEFACTS` (ignored) and the two real runtime strings they stand
 * for are added under `DERIVED` (translated).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "..");
const SPEC_FILE = path.join(ROOT, "tools/modeler_keys.json");
const DICT_FILE = path.join(ROOT, "public/locales/zh-CN/modeler.json");

/** Keys the scanner mis-captured; never passed to `translate` at runtime. */
const EXTRACTOR_ARTEFACTS = [
  "Click to {active ? 'remove' : 'set a'} dynamic value with FEEL expression",
  "List contains {numOfItems} item{items.length != 1 ? 's' : ''}",
  "{getEventLabel(element, listener.get('eventType'))}: {type}",
];

/** Runtime strings produced by the template literals behind the artefacts. */
const DERIVED = {
  "Click to remove dynamic value with FEEL expression":
    "点击以移除使用 FEEL 表达式的动态值",
  "Click to set a dynamic value with FEEL expression":
    "点击以设置使用 FEEL 表达式的动态值",
  "List contains {numOfItems} item": "列表包含 {numOfItems} 项",
  "List contains {numOfItems} items": "列表包含 {numOfItems} 项",
};

/**
 * English source string -> 简体中文.
 *
 * Terminology follows the Camunda 7 / Operaton Chinese docs: 作业 for job,
 * 外部任务 for external task, 执行监听器 / 任务监听器 for the two listener
 * kinds, 输入/输出映射 for the mapping groups. Placeholders are kept verbatim
 * because the substitution runs against the *value*, not the key.
 */
const PANEL = {
  ",": "、",
  ") to identify the error.": "）以标识错误。",
  ") to match a specific error, or leave empty to catch any error.":
    "）以匹配特定错误，或留空以捕获所有错误。",
  ").": "）。",
  "{eventType}: {type}": "{eventType}：{type}",
  "<custom type>": "<自定义类型>",
  "<empty>": "<空>",
  "<none>": "<无>",
  "1 hour and 30 minutes": "1 小时 30 分钟",
  "14 days": "14 天",
  "15 seconds": "15 秒",
  "A cycle defined as ISO 8601 repeating intervals format, or a cron expression.":
    "以 ISO 8601 重复间隔格式定义的循环，或 cron 表达式。",
  "A cycle defined as ISO 8601 repeating intervals format.":
    "以 ISO 8601 重复间隔格式定义的循环。",
  "A FEEL expression that determines whether the event should trigger.":
    "用于决定事件是否触发的 FEEL 表达式。",
  "A specific point in time defined as ISO 8601 combined date and time representation.":
    "以 ISO 8601 日期时间组合格式表示的特定时间点。",
  "A time duration defined as ISO 8601 durations format.":
    "以 ISO 8601 时长格式定义的时间长度。",
  "About conditional events.": "关于条件事件。",
  "Active elements": "活动元素",
  "Active elements collection": "活动元素集合",
  "Activity reference": "活动引用",
  "Ad-hoc subprocess documentation": "临时子流程文档",
  "Add custom key-value metadata to this element. Extension properties have no effect on process execution — they can be used to attach configuration visible for other consumers of the BPMN diagram.":
    "向此元素添加自定义键值元数据。扩展属性不影响流程执行——可用于附加供其他 BPMN 图使用方查看的配置。",
  "Add custom logic that reacts to various events in the workflow execution life-cycle.":
    "添加自定义逻辑，以响应工作流执行生命周期中的各类事件。",
  "Add input mappings to control what is passed to the activity as local variables.":
    "添加输入映射，控制作为局部变量传入活动的数据。",
  "Add output mappings to control which variables are merged back into the process scope.":
    "添加输出映射，控制哪些变量会合并回流程作用域。",
  After: "之后",
  Assignee: "办理人",
  assignment: "分配",
  Assignment: "分配",
  "Assignment type": "分配类型",
  "Asynchronous after": "之后异步",
  "Asynchronous before": "之前异步",
  "Asynchronous continuations": "异步延续",
  Before: "之前",
  Binding: "绑定",
  boolean: "布尔",
  BPMN: "BPMN",
  "Business ID": "业务 ID",
  "Business ID propagation documentation": "业务 ID 传播说明",
  "Business key": "业务键",
  "Business key expression": "业务键表达式",
  "Business rule task documentation": "业务规则任务说明",
  "Call activity documentation": "调用活动说明",
  "Called decision": "被调用决策",
  "Called decision documentation": "被调用决策说明",
  "Called element": "被调用元素",
  "Camunda Form": "Camunda 表单",
  "Camunda Form (embedded)": "Camunda 表单（内嵌）",
  "Camunda Form (linked)": "Camunda 表单（链接）",
  "Camunda Forms": "Camunda 表单",
  "Camunda user task": "Camunda 用户任务",
  "Cancel remaining instances": "取消剩余实例",
  "Candidate groups": "候选组",
  "Candidate starter": "候选发起人",
  "Candidate starter groups": "候选发起组",
  "Candidate starter users": "候选发起用户",
  "Candidate users": "候选用户",
  "Case ref": "用例引用",
  Class: "类",
  CMMN: "CMMN",
  Code: "代码",
  "Code variable": "代码变量",
  "collectEntries (List<Object>)": "collectEntries (List<Object>)",
  Compensation: "补偿",
  complete: "完成",
  Completion: "完成",
  "Completion condition": "完成条件",
  Condition: "条件",
  "Condition expression": "条件表达式",
  "Condition Expression": "条件表达式",
  "Conditional event documentation": "条件事件说明",
  "Conditions documentation": "条件说明",
  Config: "配置",
  "Configure the message that the task waits for.": "配置任务等待的消息。",
  "Configure the message that this event waits for.": "配置此事件等待的消息。",
  "Configure the message that will start this process instance.":
    "配置将启动此流程实例的消息。",
  "Configure the message that will trigger this boundary event.":
    "配置将触发此边界事件的消息。",
  "Connector ID": "连接器 ID",
  "Connector inputs": "连接器输入",
  "Connector outputs": "连接器输出",
  Constraints: "约束",
  "Control the business ID set on a child process. If left empty, no business ID will be set.":
    "控制子流程上设置的业务 ID。若留空，则不设置业务 ID。",
  "Control which variables from the called process are merged back into the parent scope. By default, all child variables are propagated; use output mappings to selectively return specific variables.":
    "控制被调用流程中的哪些变量会合并回父作用域。默认传播所有子流程变量；可使用输出映射选择性地返回特定变量。",
  create: "创建",
  Create: "创建",
  "Create new ...": "新建 ...",
  "Create new list item": "新建列表项",
  "Created in": "创建于",
  "Custom form key": "自定义表单键",
  "Custom type": "自定义类型",
  Cycle: "循环",
  date: "日期",
  Date: "日期",
  "Decision ID": "决策 ID",
  "Decision reference": "决策引用",
  "Default value": "默认值",
  "Define a boolean condition expression that determines when this sequence flow is taken.":
    "定义布尔条件表达式，决定何时走此顺序流。",
  "Define a collection of elements which will be activated when the ad-hoc subprocess is reached.":
    "定义进入临时子流程时要激活的元素集合。",
  "Define an input collection expression that defines the collection to iterate over (e.g.":
    "定义输入集合表达式，指定要遍历的集合（例如",
  "Define how to collect the outputs of the ad-hoc subprocess. The output collection variable stores the list of results; the output element expression defines what each element contributes.":
    "定义如何收集临时子流程的输出。输出集合变量保存结果列表；输出元素表达式定义每个元素的贡献内容。",
  "Define static metadata passed to job workers alongside each job. Headers are not evaluated by the engine — use them for fixed worker configuration (e.g.":
    "定义随每个作业传递给作业执行器的静态元数据。头部不会由引擎求值——可用于固定的执行器配置（例如",
  "Define the assignment, schedule, and priority of the user task. Assignee, candidate groups, and candidate users can be combined. Use due date and follow-up date to express deadlines and urgency.":
    "定义用户任务的分配、计划与优先级。办理人、候选组与候选用户可以组合使用。可使用到期日与跟进日期表达期限和紧急程度。",
  "Define the completion behavior of an ad-hoc subprocess. If no completion condition is set, it will be completed after all active elements have been completed.":
    "定义临时子流程的完成行为。若未设置完成条件，则在所有活动元素完成后完成。",
  "Define the decision to evaluate and how to map back the evaluation result.":
    "定义要评估的决策，以及如何映射回评估结果。",
  "Define the error to catch. Specify an error code (e.g.":
    "定义要捕获的错误。指定错误代码（例如",
  "Define the error to throw. Specify an error code (e.g.":
    "定义要抛出的错误。指定错误代码（例如",
  "Define the FEEL expression to evaluate and the variable to store the result in.":
    "定义要计算的 FEEL 表达式，以及存放结果的变量。",
  "Define the ID of the process to call (e.g.": "定义要调用的流程 ID（例如",
  "Define the name of the variable that will contain the error code.":
    "定义存放错误代码的变量名。",
  "Define the name of the variable that will contain the error message.":
    "定义存放错误消息的变量名。",
  "Define the name of the variable that will contain the escalation code.":
    "定义存放升级代码的变量名。",
  "Delegate Class": "委托类",
  "Delegate expression": "委托表达式",
  "Delegate Expression": "委托表达式",
  "Delegate Variable Mapping": "委托变量映射",
  delete: "删除",
  "Delete item": "删除项",
  deployment: "部署",
  "Deployment binding": "部署绑定",
  "DMN decision": "DMN 决策",
  Documentation: "文档",
  "Documentation: Timer events": "文档：定时事件",
  "Documentation: Variable events": "文档：变量事件",
  "Due date": "到期日",
  Duration: "持续时间",
  "Element documentation": "元素文档",
  "Element variable": "元素变量",
  "Embedded or External Task Forms": "内嵌或外部任务表单",
  end: "结束",
  enum: "枚举",
  Error: "错误",
  "Error event documentation": "错误事件说明",
  Errors: "错误",
  Escalation: "升级",
  "Evaluate a business rule, for example a DMN decision. To add a custom implementation, use a job worker.":
    "评估业务规则，例如 DMN 决策。如需自定义实现，请使用作业执行器。",
  "Event type": "事件类型",
  "every 10 seconds, up to 5 times": "每 10 秒，最多 5 次",
  "every day, infinitely": "每天，无限次",
  "every hour on the hour from 9-5 p.m. UTC Monday-Friday":
    "UTC 周一至周五 9-5 p.m. 的每个整点",
  Exclusive: "排他",
  Executable: "可执行",
  "Execute this task for each element of a given collection.":
    "对给定集合的每个元素执行此任务。",
  "Execution listeners": "执行监听器",
  "Execution listeners documentation": "执行监听器说明",
  Expression: "表达式",
  "Extension properties": "扩展属性",
  "External form reference": "外部表单引用",
  "External resource": "外部资源",
  "External task": "外部任务",
  "FEEL expression": "FEEL 表达式",
  "FEEL expression is mandatory": "FEEL 表达式为必填项",
  "Field injection": "字段注入",
  "Field injections": "字段注入",
  "Follow up date": "跟进日期",
  Form: "表单",
  "Form fields": "表单字段",
  "Form ID": "表单 ID",
  "Form JSON configuration": "表单 JSON 配置",
  "Form key": "表单键",
  "Form reference": "表单引用",
  Format: "格式",
  Forms: "表单",
  General: "常规",
  "Generated Task Forms": "生成的用户任务表单",
  "Global error reference": "全局错误引用",
  "Global escalation reference": "全局升级引用",
  "Global message reference": "全局消息引用",
  "Global signal reference": "全局信号引用",
  Headers: "头部",
  "History cleanup": "历史清理",
  "How to configure a timer": "如何配置定时器",
  ID: "ID",
  "ID must be a valid QName.": "ID 必须是合法的 QName。",
  "ID must be unique.": "ID 必须唯一。",
  "ID must not be empty.": "ID 不能为空。",
  "ID must not contain prefix.": "ID 不能包含前缀。",
  "ID must not contain spaces.": "ID 不能包含空格。",
  "Identifier computed from the process context that is used to correlate an incoming message (e.g.":
    "根据流程上下文计算出的标识符，用于关联传入消息（例如",
  "If turned on, all variables from the child process instance will be propagated to the parent process instance.":
    "开启后，子流程实例的所有变量都会传播到父流程实例。",
  "If turned on, all variables from the parent process instance will be propagated to the child process instance.":
    "开启后，父流程实例的所有变量都会传播到子流程实例。",
  "Implement a script task using an inline FEEL expression. To add a custom implementation, use a job worker.":
    "使用内联 FEEL 表达式实现脚本任务。如需自定义实现，请使用作业执行器。",
  "Implement a user task managed by Camunda. To add a custom implementation, use a job worker.":
    "实现由 Camunda 管理的用户任务。如需自定义实现，请使用作业执行器。",
  "Implement the ad-hoc subprocess as a job worker instead of activating inner elements. The job type determines which worker handles the subprocess execution.":
    "将临时子流程实现为作业执行器，而不是激活内部元素。作业类型决定由哪个执行器处理子流程执行。",
  Implementation: "实现",
  "Implementation type": "实现类型",
  "In mapping propagation": "输入映射传播",
  "In mappings": "输入映射",
  "Inherit from parent": "继承自父级",
  Initiator: "发起人",
  "Inline script": "内联脚本",
  "Input collection": "输入集合",
  "Input element": "输入元素",
  "Input mapping": "输入映射",
  "Input mappings documentation": "输入映射说明",
  "Input propagation": "输入传播",
  Inputs: "输入",
  "Java class": "Java 类",
  "Job execution": "作业执行",
  "Job priority": "作业优先级",
  "Job priority documentation": "作业优先级说明",
  "Job type": "作业类型",
  "Job worker": "作业执行器",
  "JSON contains errors": "JSON 包含错误",
  Key: "键",
  Label: "标签",
  latest: "最新",
  "Latest binding": "最新绑定",
  "Learn how to define conditions.": "了解如何定义条件。",
  "Learn more.": "了解更多。",
  Link: "链接",
  "Link a form created with the Camunda Forms editor. Submitting this form will start a new process instance.":
    "链接一个用 Camunda 表单编辑器创建的表单。提交此表单将启动新的流程实例。",
  "Link a form created with the Camunda Forms editor. To associate a custom form, application, or URL to the user task, specify an external reference.":
    "链接一个用 Camunda 表单编辑器创建的表单。如需为用户任务关联自定义表单、应用或 URL，请指定外部引用。",
  "Link or embed a form created with the Camunda Forms editor. To associate a custom form, application, or URL to the user task, specify a form key.":
    "链接或内嵌一个用 Camunda 表单编辑器创建的表单。如需为用户任务关联自定义表单、应用或 URL，请指定表单键。",
  List: "列表",
  "List values": "列表值",
  "Listener ID": "监听器 ID",
  "Listener type": "监听器类型",
  Local: "局部",
  long: "长整型",
  "Loop cardinality": "循环基数",
  Map: "映射",
  "Map decision result": "映射决策结果",
  "Map entries": "映射条目",
  Message: "消息",
  "Message boundary event documentation": "消息边界事件说明",
  "Message catch event documentation": "消息捕获事件说明",
  "Message start event documentation": "消息开始事件说明",
  "Message throw event documentation": "消息抛出事件说明",
  "Message variable": "消息变量",
  "Multi instance documentation": "多实例说明",
  "Multi-instance": "多实例",
  "Multiple elements are selected. Select a single element to edit its properties.":
    "已选择多个元素。请选择单个元素以编辑其属性。",
  Name: "名称",
  "Number of days before this resource is being cleaned up. If specified, takes precedence over the engine configuration.":
    "此资源被清理前的天数。若指定，将优先于引擎配置。",
  Off: "关闭",
  On: "开启",
  "Open documentation": "打开文档",
  "Open pop-up editor": "打开弹窗编辑器",
  "Opened in editor": "在编辑器中打开",
  or: "或",
  "Otherwise, only variables defined via input mappings will be propagated.":
    "否则，仅传播通过输入映射定义的变量。",
  "Otherwise, only variables defined via output mappings will be propagated.":
    "否则，仅传播通过输出映射定义的变量。",
  "Out mapping propagation": "输出映射传播",
  "Out mappings": "输出映射",
  "Output collection": "输出集合",
  "Output element": "输出元素",
  "Output mapping": "输出映射",
  "Output mappings documentation": "输出映射说明",
  "Output propagation": "输出传播",
  Outputs: "输出",
  "Participant Name": "参与者名称",
  Priority: "优先级",
  "Process documentation": "流程文档",
  "Process ID": "流程 ID",
  "Process name": "流程名称",
  "Process variables": "流程变量",
  "Propagate all child process variables": "传播所有子流程变量",
  "Propagate all parent process variables": "传播所有父流程变量",
  "Propagate all variables": "传播所有变量",
  Properties: "属性",
  "React to user task lifecycle events by executing a job worker.":
    "通过执行作业执行器来响应用户任务生命周期事件。",
  "Receive task message documentation": "接收任务消息说明",
  "Refers to the process variable name": "指向流程变量名",
  Resource: "资源",
  "Result variable": "结果变量",
  "resultList (List<Map<String, Object>>)":
    "resultList (List<Map<String, Object>>)",
  Retries: "重试次数",
  "Retry time cycle": "重试时间间隔",
  Scope: "作用域",
  Script: "脚本",
  "Script task documentation": "脚本任务说明",
  "Script type": "脚本类型",
  "Section contains a warning": "本节包含警告",
  "Section contains an error": "本节包含错误",
  "Section contains edits": "本节包含未保存的修改",
  "Select an element to edit its properties.": "选择一个元素以编辑其属性。",
  "Send task documentation": "发送任务说明",
  "Service task documentation": "服务任务说明",
  Signal: "信号",
  "singleEntry (TypedValue)": "singleEntry (TypedValue)",
  "singleResult (Map<String, Object>)":
    "singleResult (Map<String, Object>)",
  Source: "来源",
  "Source expression": "来源表达式",
  "Specifies the default priority for all jobs created by a process. Must be an integer. If no value is provided, the default value is 0.":
    "指定流程创建的所有作业的默认优先级。必须为整数。若未提供值，默认值为 0。",
  "Specifies the priority of a job. Must be an integer. If no value is provided, the default value is 0.":
    "指定作业的优先级。必须为整数。若未提供值，默认值为 0。",
  "Specifies the priority of a user task. Must be an integer between 0 and 100. If no value is provided, the default value is 50.":
    "指定用户任务的优先级。必须为 0 到 100 之间的整数。若未提供值，默认值为 50。",
  "Specify more than one group as a comma separated list.":
    "多个组请用逗号分隔。",
  "Specify more than one user as a comma separated list.":
    "多个用户请用逗号分隔。",
  "Specify more than one variable change event as a comma separated list. Variable change events are:":
    "多个变量变更事件请用逗号分隔。变量变更事件包括：",
  "Specify the condition that triggers this event.": "指定触发此事件的条件。",
  "Specify which job workers handle the event work.":
    "指定由哪些作业执行器处理事件工作。",
  "Specify which job workers handle the task work to evaluate business rules.":
    "指定由哪些作业执行器处理用于评估业务规则的任务工作。",
  "Specify which job workers handle the task work to execute a script.":
    "指定由哪些作业执行器处理用于执行脚本的任务工作。",
  "Specify which job workers handle the task work to execute a service (e.g.":
    "指定由哪些作业执行器处理用于执行服务的任务工作（例如",
  "Specify which job workers handle the task work to send a message (e.g.":
    "指定由哪些作业执行器处理用于发送消息的任务工作（例如",
  start: "开始",
  "Start event form documentation": "开始事件表单说明",
  "Start initiator": "启动发起人",
  'Start typing "${}" to create an expression.':
    '输入 "${}" 以创建表达式。',
  Startable: "可启动",
  string: "字符串",
  String: "字符串",
  "String or expression": "字符串或表达式",
  "Subscription correlation key": "订阅关联键",
  "Subscription correlation key documentation": "订阅关联键说明",
  take: "获取",
  Target: "目标",
  "Task definition": "任务定义",
  "Task headers documentation": "任务头部说明",
  "Task listeners": "任务监听器",
  "Task listeners documentation": "任务监听器说明",
  Tasklist: "任务列表",
  "Tenant ID": "租户 ID",
  "The due date as an EL expression (e.g. ${someDate}) or an ISO date (e.g. 2015-06-26T09:54:00).":
    "到期日，可用 EL 表达式（例如 ${someDate}）或 ISO 日期（例如 2015-06-26T09:54:00）。",
  "The number of times the engine tries executing this activity if a worker signals a failure. The default is three.":
    "当执行器报告失败时，引擎重试执行此活动的次数。默认为三次。",
  "This maps to the process definition key.": "对应流程定义键。",
  "Throw expression": "抛出表达式",
  "Time to live": "存活时间",
  timeout: "超时",
  Timer: "定时器",
  "Timer documentation": "定时器说明",
  "To collect the output define the output collection and the output element expressions.":
    "如需收集输出，请定义输出集合与输出元素表达式。",
  "Toggle list item": "切换列表项",
  "Toggle section": "切换本节",
  Topic: "主题",
  Type: "类型",
  "Unparsable FEEL expression.": "无法解析的 FEEL 表达式。",
  update: "更新",
  Update: "更新",
  "User assignment": "用户分配",
  "User task documentation": "用户任务说明",
  "User task form documentation": "用户任务表单说明",
  "User task priority documentation": "用户任务优先级说明",
  "Uses the most recent deployed resource with the given version tag.":
    "使用给定版本标签的最新部署资源。",
  "Uses the most recent deployed resource.": "使用最新部署的资源。",
  "Uses the resource found in the same deployment.":
    "使用同一部署中的资源。",
  "UTC plus 2 hours zone offset": "UTC 加 2 小时时区偏移",
  "UTC time": "UTC 时间",
  Value: "值",
  Values: "值",
  "Variable assignment value": "变量赋值",
  "Variable events": "变量事件",
  "Variable events that trigger the condition evaluation. If none selected, all variable events will trigger the condition evaluation.":
    "触发条件评估的变量事件。若未选择，则所有变量事件都会触发条件评估。",
  "Variable name": "变量名",
  version: "版本",
  Version: "版本",
  "version tag": "版本标签",
  "Version tag": "版本标签",
  "Version tag binding": "版本标签绑定",
  "Version tag by which the called decision will be referenced.":
    "引用被调用决策时使用的版本标签。",
  "Version tag by which the called process will be referenced.":
    "引用被调用流程时使用的版本标签。",
  "Version tag by which the linked form will be referenced.":
    "引用所链接表单时使用的版本标签。",
  "Version tag by which this process can be referenced.":
    "其他流程引用此流程时使用的版本标签。",
  versionTag: "versionTag",
  "Wait for completion": "等待完成",
};

/** Every key this script is responsible for, for the other tooling to consult. */
export const PANEL_ZH_KEYS = [...Object.keys(PANEL), ...Object.keys(DERIVED)];

const read_json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const sorted = (entries) =>
  Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)));

const panel_keys = () => {
  const { keys } = read_json(SPEC_FILE);
  return [
    ...new Set(
      keys.filter((entry) => entry.surface === "propertiesPanel").map((entry) => entry.key),
    ),
  ];
};

const main = () => {
  const check = process.argv.includes("--check");
  const current = read_json(DICT_FILE);
  const expected = panel_keys().filter((key) => !EXTRACTOR_ARTEFACTS.includes(key));

  const next = { ...current, ...PANEL, ...DERIVED };

  const missing = expected.filter(
    (key) => typeof next[key] !== "string" || !next[key].trim(),
  );
  // A key we translate that upstream does not use any more is dead weight, and
  // usually means the English source string was reworded. The derived keys are
  // ours by construction, so they are exempt.
  const unexpected = [...Object.keys(PANEL), ...Object.keys(DERIVED)].filter(
    (key) => !expected.includes(key) && !(key in current) && !(key in DERIVED),
  );

  const rel = path.relative(ROOT, DICT_FILE).replace(/\\/g, "/");
  const body = `${JSON.stringify(sorted(next), null, 2)}\n`;
  const changed = body !== `${JSON.stringify(current, null, 2)}\n`;

  if (missing.length || unexpected.length) {
    console.error(`${rel}: ${missing.length} missing, ${unexpected.length} unexpected`);
    missing.forEach((key) => console.error(`  missing    ${JSON.stringify(key)}`));
    unexpected.forEach((key) => console.error(`  unexpected ${JSON.stringify(key)}`));
    process.exitCode = 1;
    return;
  }

  if (check) {
    if (changed) {
      console.error(`${rel}: out of date (run without --check)`);
      process.exitCode = 1;
    } else {
      console.log(`${rel}: up to date, ${Object.keys(next).length} keys`);
    }
    return;
  }

  if (changed) fs.writeFileSync(DICT_FILE, body, "utf8");
  console.log(
    `${changed ? "wrote" : "unchanged"}  ${rel}  ${Object.keys(next).length} keys ` +
      `(${expected.length} panel + ${Object.keys(current).length} existing)`,
  );
};

// Only run when invoked directly, so `fill_modeler_dicts.mjs` can import the key
// list without triggering a write.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}