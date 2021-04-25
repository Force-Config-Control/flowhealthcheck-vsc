import * as fs from "mz/fs";
import * as vscode from "vscode";
import {XMLParser} from "./XMLParser";
import Flow = require("../models/Flow");
const path = require('path');

export class SelectAFlow {

    private message: string;

    constructor(rootPath: vscode.Uri, message: string) {
        this.message = message;
    }

    public async execute(flowUri : vscode.Uri) {
        vscode.window.showInformationMessage(this.message);

        let selectedFlowFile;
        do {
            selectedFlowFile = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                defaultUri: flowUri,
                filters: {
                    'Flow': ['flow-meta.xml']
                }
            });
        } while (!selectedFlowFile);
        return this.parseFlow(selectedFlowFile[0]);
    }

    private async parseFlow(selectedUri: vscode.Uri) {
        const parsedContent: { Flow: Flow } = await new XMLParser().execute(await fs.readFile(path.normalize(selectedUri.fsPath)));
        return new Flow(
            {
                label: parsedContent.Flow.label,
                interviewLabel: parsedContent.Flow.interviewLabel,
                processType: parsedContent.Flow.processType,
                processMetadataValues: parsedContent.Flow.processMetadataValues,
                start: parsedContent.Flow.start,
                status: parsedContent.Flow.status,
                uri: selectedUri,
                xmldata: parsedContent
            }
        );
    }
}
