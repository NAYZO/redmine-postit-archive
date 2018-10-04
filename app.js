const config = require('./config.js');
const { buildPdf } = require('./ticketsBuilder.js');
const { call } = require('./utils.js')(config);
require('colors');
const _ = require('lodash');
const moment = require('moment');
const inquirer = require('inquirer');
const { exec } = require('child_process');
const Redmine = require('node-redmine');
const util = require('util');

const getProjectInfo = async (config) => {
    const projectData = await call({ endpoint: `/projects/${config.project.parentId}.json`, params: { limit: 200 } });
    return projectData.project;
}

const crawlSprints = async (config, now) => {
    const sprintsData = await call({ endpoint: `/projects/${config.project.parentId}/versions.json`, params: { limit: 200 } });
    const sprints = _
        .chain(sprintsData.versions)
        .filter(['status', 'open'])
        .filter(sprint => sprint.name.indexOf('Sprint N') !== -1)
        .map(sprint => ({ ...sprint, current: false, due_date: moment(sprint.due_date) }))
        .sortBy('due_date')
        .value();
    _.find(sprints, sprint => sprint.due_date > now).current = true;
    return sprints;
};

const selectSprint = async sprints => (await inquirer.prompt([{
    type: 'list',
    name: 'sprint',
    message: 'Quel sprint ?',
    choices: sprints.map(sprint => ({ name: sprint.name, value: sprint.id })),
    default: _.findIndex(sprints, sprint => sprint.current),
}])).sprint;

const getIssues = async (config, sprintId) => {
    const issuesData = (await call({ endpoint: `/issues.json`, params: { fixed_version_id: sprintId, project_id: config.project.parentId, limit: 200 } })).issues;
    return _.map(issuesData, data => ({
        id: data.id,
        project: data.project.name,
        color: config.project.colors[data.project.id],
        subject: data.subject,
        priority: data.priority.name,
        category: data.category ? data.category.name : null,
        complexity: data.estimated_hours,
        printed: !!parseInt(_.find(data.custom_fields, ['id', 31]).value),
    }));
}

const askForSetPrinted = async () => (await inquirer.prompt([{
    type: 'confirm',
    name: 'open',
    message: 'Indiquer les tickets comme imprimés ?',
}])).open;

const inlineIssue = i => `${config.hostname}/issues/${i.id} ${i.subject} ${i.complexity ? `(${i.complexity})` : ''}`;

const askForManualIssueFiltering = async (issues) => (await inquirer.prompt([{
    type: 'checkbox',
    name: 'issues',
    message: 'Indiquer ces tickets comme "imprimés": ',
    pageSize: 30,
    choices: issues.map(i => {
        return { name: inlineIssue(i), value: i, checked: true };
    }),
}])).issues;


const setTicketPrinted = (id, printed) => new Promise((resolve, reject) => redmine.update_issue(
    id,
    { "issue": { "custom_fields": [{ "value": printed ? "1" : "0", "id": 31 }] } },
    (err, data) => (err ? reject(err) : resolve(data))
));

const redmine = new Redmine(config.hostname, { apiKey: config.auth.key });
const pdfPath = __dirname + '/tickets-to-print.pdf';

const run = async () => {

    // Dispay projet name
    const projectInfo = await getProjectInfo(config);
    console.log(`Projet: ${projectInfo.name} `.yellow);

    // Crawl sprints
    const now = moment();
    const sprints = await crawlSprints(config, now);

    // Select sprint
    const sprintId = await selectSprint(sprints);

    // Get issues
    let issues = await getIssues(config, sprintId);

    const issuesCount = issues.length;

    issues = _.filter(issues, ['printed', false]);
    const printedIssuesCount = issues.length;
    issues = _.sortBy(issues, 'project');

    console.log(`${issuesCount} ticket(s) dans ce sprint. ${printedIssuesCount} ticket(s) à imprimer.`);

    if (issues.length === 0) {
        return;
    }

    // Ask for manual issues filtering.
    issues = await askForManualIssueFiltering(issues);

    // Generate pdf.
    await buildPdf(pdfPath, issues);
    // exec(`open ${pdfPath} `, (err, stdout, stderr) => { if (err) return; }); // Mac
    exec(`evince ${pdfPath} `, (err, stdout, stderr) => { if (err) return; }); // Linux (evince)

    // Ask for set tickets as printed.
    const setPrinted = await askForSetPrinted();

    // Check tickets as printed.
    if (setPrinted) {
        await Promise.all(issues.map(issue => { setTicketPrinted(issue.id, true) }));
        console.log(`${issues.length} ticket(s) set as printed.`);
    }
}

run();
