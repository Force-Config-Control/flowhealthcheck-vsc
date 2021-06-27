import {BaseCommand} from "./BaseCommand";
import * as vscode from "vscode";
import {SelectFlows} from "../libs/SelectFlows";
import {ParseFlows} from "../libs/ParseFlows";
import {LintFlowsReport} from "../panels/LintFlowsReport";
import * as core from 'flowhealthcheck--core/out';
import {Flow} from "flowhealthcheck--core/out/main/models/Flow";
import {ScanOptions} from "flowhealthcheck--core/out/main/models/ScanOptions";

export class ScanFlowsCommand extends BaseCommand {

  constructor(context: vscode.ExtensionContext
  ) {
    super(context)
  }

  public async execute() {

    const selectedUris: vscode.Uri[] = await new SelectFlows(this.rootPath, 'Select your Flow(s):').execute(this.rootPath);
    if (selectedUris) {
      const flows: Flow[] = await new ParseFlows().execute(selectedUris);
      core.scan(flows, new ScanOptions(true, true, true, true, true, true, true, true));
      LintFlowsReport.createOrShow(this.context.extensionUri, flows);
    }
  }

}
