import * as vscode from 'vscode';
import { RuleOverview } from '../panels/RuleOverviewPanel';
import { SelectFlows } from '../libs/SelectFlows';
import { SaveFlow } from '../libs/SaveFlow';
import { ScanOverview } from '../panels/ScanOverviewPanel';
import * as core from 'lightning-flow-scanner-core';
import { findFlowCoverage } from '../libs/FindFlowCoverage';
import { CacheProvider } from '../providers/cache-provider';
import { testdata } from '../store/testdata';
import { OutputChannel } from '../providers/outputChannel';
import { IRulesConfig } from 'lightning-flow-scanner-core/main/interfaces/IRulesConfig';

export default class Commands {
  constructor(private context: vscode.ExtensionContext) {}

  get handlers() {
    return Object.entries({
      'lightningflowscanner.viewDefaulFlowRules': () =>
        this.viewDefaulFlowRules(),
      'lightningflowscanner.configRules': () => this.configRules(),
      'lightningflowscanner.debugView': () => this.debugView(),
      'lightningflowscanner.scanFlows': () => this.scanFlows(),
      'lightningflowscanner.fixFlows': () => this.fixFlows(),
      'lightningflowscanner.calculateFlowTestCoverage': () =>
        this.calculateFlowTestCoverage(),
    });
  }

  private viewDefaulFlowRules() {
    RuleOverview.createOrShow(this.context.extensionUri);
  }

  private async configRules() {
    const allRules = core.getRules();
    const ruleConfig = { rules: {} };

    const items = allRules.map((rule) => {
      return { label: rule.label, value: rule.name };
    });
    items.forEach((item) => {
      item['picked'] = true;
    });

    const selectedRules = await vscode.window.showQuickPick(items, {
      canPickMany: true,
    });

    for (const rule of allRules) {
      if (selectedRules.map((r) => r.value).includes(rule.name)) {
        ruleConfig.rules[rule.name] = { severity: 'error' };
      }
    }
    if (selectedRules.map((r) => r.value).includes('FlowName')) {
      const namingConventionString = await vscode.window.showInputBox({
        prompt:
          'Readability of a flow is very important. Setting a naming convention for the Flow Name will improve the findability/searchability and overall consistency. You can define your default naming convention using REGEX.',
        placeHolder: '[A-Za-z0-9]+_[A-Za-z0-9]+',
        value: '[A-Za-z0-9]+_[A-Za-z0-9]+',
      });
      ruleConfig.rules['FlowName'] = {
        severity: 'error',
        expression: namingConventionString,
      };
      await vscode.workspace
        .getConfiguration()
        .update(
          'lightningFlowScanner.NamingConvention',
          namingConventionString,
          true
        );
    }
    if (selectedRules.map((r) => r.value).includes('APIVersion')) {
      const apiVersionEvalExpressionString = await vscode.window.showInputBox({
        prompt:
          ' The Api Version has been available as an attribute on the Flow since API v50.0 and it is recommended to limit variation and to update them on a regular basis. Set an expression to set a valid range of API versions(Minimum 50).',
        placeHolder: '>50',
        value: '>50',
      });
      ruleConfig.rules['APIVersion'] = {
        severity: 'error',
        expression: apiVersionEvalExpressionString,
      };
      await vscode.workspace
        .getConfiguration()
        .update(
          'lightningFlowScanner.APIVersion',
          apiVersionEvalExpressionString,
          true
        );
    }
    await CacheProvider.instance.set('ruleconfig', ruleConfig);
  }

  private async debugView() {
    const results = testdata as unknown as core.ScanResult[];
    await CacheProvider.instance.set('results', results);
    ScanOverview.createOrShow(this.context.extensionUri, results);
    await vscode.commands.executeCommand(
      'workbench.action.webview.openDeveloperTools'
    );
  }

  private async calculateFlowTestCoverage() {
    const results = CacheProvider.instance.get('results') as core.ScanResult[];
    ScanOverview.createOrShow(this.context.extensionUri, []);
    if (results && results.length > 0) {
      const coverageMap = await findFlowCoverage(results);
      const newResults = [];
      for (const result of results) {
        const flowName = result.flow.name;
        const coverage = coverageMap.get(flowName);
        result['coverage'] = coverage;
        newResults.push(result);
        await CacheProvider.instance.set('results', newResults);
        ScanOverview.createOrShow(this.context.extensionUri, newResults);
      }
    } else {
      vscode.window.showInformationMessage(
        'No results found. Please make sure to complete a scan before calculating coverage.'
      );
    }
  }

  private async scanFlows() {
    const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri;
    const selectedUris = await new SelectFlows(
      rootPath,
      'Select a root folder:'
    ).execute(rootPath);
    OutputChannel.getInstance().logChannel.debug(
      'Selected uris',
      ...selectedUris
    );
    if (selectedUris.length > 0) {
      let results: core.ScanResult[] = [];
      ScanOverview.createOrShow(this.context.extensionUri, results);
      OutputChannel.getInstance().logChannel.trace('create panel');
      const configReset: vscode.WorkspaceConfiguration =
        vscode.workspace
          .getConfiguration('lightningFlowScanner')
          .get('Reset') ?? undefined;
      OutputChannel.getInstance().logChannel.trace(
        'load vscode stored configurations'
      );
      if (configReset) {
        OutputChannel.getInstance().logChannel.trace('reset configurations');
        await this.configRules();
      }
      const ruleConfig = CacheProvider.instance.get(
        'ruleconfig'
      ) as IRulesConfig;
      results = core.scan(await core.parse(selectedUris), ruleConfig);
      OutputChannel.getInstance().logChannel.debug('Scan Results', ...results);
      await CacheProvider.instance.set('results', results);
      ScanOverview.createOrShow(this.context.extensionUri, results);
    } else {
      vscode.window.showInformationMessage('No flow files found.');
    }
  }

  private async fixFlows() {
    const storedResults = CacheProvider.instance.get(
      'results'
    ) as core.ScanResult[];
    OutputChannel.getInstance().logChannel.trace(
      'has scan results?',
      storedResults.length
    );
    if (storedResults && storedResults.length > 0) {
      OutputChannel.getInstance().logChannel.debug(
        'contains scan results',
        ...storedResults
      );
      ScanOverview.createOrShow(this.context.extensionUri, []);
      const newResults: core.ScanResult[] = core.fix(storedResults);
      OutputChannel.getInstance().logChannel.debug(
        'invoked scanned results in total: ',
        newResults.length
      );
      for (const newResult of newResults) {
        OutputChannel.getInstance().logChannel.trace('Fixed File', newResult);
        const uri = vscode.Uri.file(newResult.flow.fsPath);
        await new SaveFlow().execute(newResult.flow, uri);
      }
      if (newResults && newResults.length > 0) {
        OutputChannel.getInstance().logChannel.trace(
          'Has fixed results, storing inside cache'
        );
        await CacheProvider.instance.set('results', newResults);
        await ScanOverview.createOrShow(this.context.extensionUri, newResults);
      } else {
        OutputChannel.getInstance().logChannel.trace(
          'Nothing fixed, showing warning message'
        );
        await ScanOverview.createOrShow(
          this.context.extensionUri,
          storedResults
        );
        await vscode.window.showWarningMessage(
          'Fix Flows: UnusedVariable and UnconnectedElement rules are currently supported, stay tuned for more rules.'
        );
      }
    }
  }
}
