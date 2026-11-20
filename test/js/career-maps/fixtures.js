/**
 * Career maps data and the parts of the Webflow templates the rendering touches, trimmed from the live pages.
 */

export const createCareerMaps = () => [
  {
    name: 'General & Administrative',
    teams: [
      {
        name: 'Finance',
        link: 'https://bitrise.atlassian.net/wiki/spaces/BO/pages/1/Finance',
        jobs: {
          'Controlling Specialist': {
            P2: {
              name: 'P2 - Associate Controlling Specialist',
              link: 'https://bitrise.atlassian.net/wiki/spaces/BO/pages/2/P2',
              warnings: ['Tenure is missing!'],
              salaryNotes: 'Monthly in Hungary.',
              salary: { 'Hungary (HUF)': { lowEnd: 575000, midPoint: 776667, highEnd: 958333 } },
              bonus: '7.5%',
              description: '<p>Finance P2</p>',
            },
          },
        },
      },
      { name: 'Legal', link: 'https://bitrise.atlassian.net/wiki/spaces/BO/pages/3/Legal', jobs: {} },
    ],
  },
  {
    name: 'Research and Development',
    teams: [
      {
        name: 'Engineering',
        link: 'https://bitrise.atlassian.net/wiki/spaces/BO/pages/4/Engineering',
        jobs: {
          'Software Engineer': {
            P2: {
              name: 'Software Engineer (P2)',
              link: 'https://bitrise.atlassian.net/wiki/spaces/BO/pages/5/P2',
              salary: {
                'Hungary (HUF)': { lowEnd: 900000, highEnd: 1300000 },
                'Germany (EUR)': { lowEnd: 1, highEnd: 2 },
                'US (USD)': { lowEnd: 120000, highEnd: 180000 },
              },
              bonus: '10%',
              tenure: '<strong>12-18 months</strong>',
              description:
                '<h2>Scope</h2><p>See <a href="https://bitrise.atlassian.net/wiki/x">the wiki</a> and <a href="https://example.com/">this</a>.</p>' +
                '<table><tbody><tr><td>Impact</td><td>Team</td></tr><tr><td>Empty</td><td> </td></tr></tbody></table>',
            },
            P3: {
              name: 'Software Engineer (P3)',
              link: 'https://bitrise.atlassian.net/wiki/spaces/BO/pages/6/P3',
              salary: { 'US (USD)': { lowEnd: 160800, highEnd: 241200 } },
              variablePay: '5%',
              description: '<p>Engineering P3</p>',
            },
          },
          'Engineering Manager': {
            M3: {
              name: 'Engineering Manager (M3)',
              link: 'https://bitrise.atlassian.net/wiki/spaces/BO/pages/7/M3',
              salary: {},
              description: '<p>Manager</p>',
            },
          },
        },
      },
    ],
  },
];

export const OVERVIEW_HTML = `<!DOCTYPE html><html><head>
<title>Career maps</title>
<meta content="Generic description" name="description">
<link href="https://bitrise.io/careers/maps" rel="canonical">
</head><body><div class="cm-departments">
<div data-template-id="cm-department" class="cm-loading">
  <h2 data-template-id="cm-department-name">{department_name}</h2>
  <p data-template-id="cm-department-description">{department_description}</p>
  <div data-template-id="cm-team-grid">
    <div data-template-id="cm-team">
      <div><h3 data-template-id="cm-team-name">{team_name}</h3><img src="default.png" srcset="default.png 1x" class="cm-team-header-image"></div>
      <ul data-template-id="cm-team-job-list"><li data-template-id="cm-team-job-list-item"><a href="#" class="text-link">{job_name}</a></li></ul>
      <a data-template-id="cm-team-link" href="#">View career map →</a>
    </div>
  </div>
</div>
</div></body></html>`;

export const TEAM_HTML = `<!DOCTYPE html><html><head>
<title>Career Map Framework</title>
<meta content="Generic description" name="description">
<meta content="Career Map Framework" property="og:title">
<meta content="Generic description" property="og:description">
<meta content="Career Map Framework" name="twitter:title">
<link href="https://bitrise.io/careers/maps/team" rel="canonical">
</head><body>
<h1 id="cm-team-page-title">{job_name} career map</h1>
<div class="cm-loading">
  <div id="cm-team-sidebar">
    <a href="/careers/maps">← Career maps</a><a id="cm-sidebar-toggle" href="#">menu</a>
    <div class="cm-sidebar-divider"></div>
    <div class="cm-sidebar-list">
      <div id="cm-team-sidebar-job-section">
        <h5 id="cm-team-sidebar-job-heading">{job_name} Levels</h5>
        <ul id="cm-team-sidebar-level-list">
          <li id="cm-team-sidebar-level-item"><a href="#" class="cm-selected-level cm-level-name">{level_name}</a></li>
          <li><a href="#" class="cm-level-name">{level_name}</a></li>
        </ul>
      </div>
    </div>
  </div>
  <h2 id="cm-level-heading">Level heading</h2>
  <div id="cm-compensation-section">
    <p id="cm-salary-notes">Template notes</p>
    <div id="cm-compensation-table"><table>
      <thead><tr><th>Location</th><th>Low</th><th>High</th></tr></thead>
      <tbody><tr><td>Country (CUR)</td><td>000,000</td><td>000,000</td></tr></tbody>
    </table></div>
    <div id="cm-bonus-title">Bonus percentage:</div><div id="cm-bonus-value">0%</div>
  </div>
  <div id="cm-tenure-section"><div id="cm-tenure-description">Template tenure</div></div>
  <div id="cm-way-of-working-section"><div id="cm-way-of-working-description"><p>Lorem ipsum</p></div></div>
</div>
</body></html>`;
