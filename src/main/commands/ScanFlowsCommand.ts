import { BaseCommand } from "./BaseCommand";
import * as vscode from "vscode";
import { SelectFlows } from "../libs/SelectFlows";
import { ParseFlows } from "../libs/ParseFlows";
import { LintFlowsReport } from "../panels/LintFlowsReport";
import * as core from 'lightning-flow-scanner-core/out';
import { Flow } from "lightning-flow-scanner-core/out/main/models/Flow";
import { ScanResult } from "lightning-flow-scanner-core/out/main/models/ScanResult";
import { FindFlowCoverage } from "../libs/FindFlowCoverage";

export class ScanFlowsCommand extends BaseCommand {

  constructor(context: vscode.ExtensionContext
  ) {
    super(context)
  }

  public async execute() {
    const selectedUris: vscode.Uri[] = await new SelectFlows(this.rootPath, 'Select a root folder:').execute(this.rootPath);
    if (selectedUris.length > 0) {

      LintFlowsReport.createOrShow(this.context.extensionUri, undefined, "Scan");
      const flows: Flow[] = await new ParseFlows().execute(selectedUris);
      const allRules = core.getRules();
      const ruleConfig = {rules: {}};
      for (const rule of allRules){
        ruleConfig.rules[rule.name] = {'severity': 'error'}
      }
      let namingConventionString;
      let apiVersionEvalExpressionString;
      let initialConfiguration: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('lightningFlowScanner').get("initialConfiguration");
      if((initialConfiguration as unknown as boolean)){
        namingConventionString = await vscode.window.showInputBox({'prompt': 'Readability of a flow is very important. Setting a naming convention for the Flow Name will improve the findability/searchability and overall consistency. You can define your default naming convention using REGEX.', placeHolder: '[A-Za-z0-9]+_[A-Za-z0-9]+', value: '[A-Za-z0-9]+_[A-Za-z0-9]+'});
        apiVersionEvalExpressionString = await vscode.window.showInputBox({'prompt': ' The Api Version has been available as an attribute on the Flow since API v50.0 and it is recommended to limit variation and to update them on a regular basis. Set an expression to set a valid range of API versions(Minimum 50).', placeHolder: '>50', value: '>50'});
        ruleConfig.rules['FlowName'] = {'severity': 'error', 'expression': namingConventionString};
        ruleConfig.rules['APIVersion'] = {'severity': 'error', 'expression': apiVersionEvalExpressionString};
        await vscode.workspace.getConfiguration().update('lightningFlowScanner.namingConvention', namingConventionString, true);
        await vscode.workspace.getConfiguration().update('lightningFlowScanner.versionAPI', apiVersionEvalExpressionString, true);
        await vscode.workspace.getConfiguration().update('lightningFlowScanner.initialConfiguration', false, true);
      } 
      const results: ScanResult[] = core.scan(flows, ruleConfig);
      // todo find coverage asynchronously
      await FindFlowCoverage(results);
      LintFlowsReport.createOrShow(this.context.extensionUri, results, "Scan");
    } else {
      vscode.window.showInformationMessage('No flow files found.');
    }

  }
}
