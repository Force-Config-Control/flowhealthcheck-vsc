import FlowMetadata = require("./FlowMetadata");
import FlowVariable = require("./FlowVariable");
import FlowElement = require("./FlowElement");
import {Uri} from "vscode";

export = class Flow {

    public interviewLabel: string;
    public label: string;
    public processType;
    public processMetadataValues;
    public start;
    public status;
    public uri: Uri;
    public xmldata;

    public path?: string;
    public flowMetadata?;
    public unconnectedElements;
    public unusedVariables;
    public nodesWithHardcodedIds;
    public dmlStatementInLoop;
    public missingFaultPaths;

    public processedData?;
    public nodes?;

    constructor(args) {
        this.interviewLabel = args.interviewLabel;
        this.label = args.label;
        this.processMetadataValues = args.processMetadataValues;
        this.processType = args.processType;
        this.start = args.start;
        this.status = args.status;
        this.uri = args.uri;
        if(args.uri){
            this.path = args.uri.fsPath;
        }
        if(args.path){
            this.path = args.path;
        }
        this.xmldata = args.xmldata;
        this.nodes = this.preProcessNodes(args.xmldata);
    }

    private preProcessNodes(xml) {
        const mergeableVariables = ["variables", "constants", "formulas", "stages", "textTemplates"];
        const flowMetadata = ["description",
            "apiVersion",
            "processMetadataValues",
            "processType",
            "interviewLabel",
            "label",
            "status"
        ];
        const allNodes = [];
        const flowXML = xml.Flow;
        for (let nodeType in flowXML) {
            let nodes = flowXML[nodeType];
            // skip xmlns url
            if (nodeType == '$'){
                continue;
            }
            if (flowMetadata.includes(nodeType)) {
                for (let node of nodes) {
                    allNodes.push(new FlowMetadata(
                        nodeType,
                        node
                    ));
                }
            } else if (mergeableVariables.includes(nodeType)) {
                for (let node of nodes) {
                    allNodes.push(
                        new FlowVariable(node.name, nodeType, node)
                    );
                }
            } else {
                for (let node of nodes) {
                    allNodes.push(
                        new FlowElement(node.name, nodeType, node)
                    );
                }
            }
        }

        this.label= xml.Flow.label;
        this.interviewLabel= xml.Flow.interviewLabel;
        this.processType = xml.Flow.processType;
        this.processMetadataValues = xml.Flow.processMetadataValues;
        this.start= xml.Flow.start;
        this.status= xml.Flow.status;
        return allNodes;
    }

};