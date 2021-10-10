import {GetOrgInfo} from "./GetOrgInfo";
import {GetFlowCoverage} from "./GetFlowCoverage";
import {GetFlowDefinitionViews} from "./GetFlowDefinitionViews";

export async function FindFlowCoverage(results) {

  const orgInfo = await new GetOrgInfo().getOrgInfo();
  if(orgInfo && orgInfo.result && orgInfo.result.username){
    const flowCoverage = await new GetFlowCoverage().getFlowCoverage(orgInfo.result.username);
    const flowDefinitions = await new GetFlowDefinitionViews().getFlowDefinitionViews(orgInfo.result.username);
    for (const scanResult of results){
      const matchingFlowDefinition = flowDefinitions.result.records.find((record) => scanResult.flow.label[0] === record.Label);
      scanResult['matchingFlowDefinition'] = matchingFlowDefinition;
      const matchingFlowCoverage = flowCoverage.result.records.find(record => matchingFlowDefinition.ActiveVersionId === record.FlowVersionId);
      if(matchingFlowCoverage){
        scanResult['coverage'] = matchingFlowCoverage.NumElementsCovered / (matchingFlowCoverage.NumElementsCovered + matchingFlowCoverage.NumElementsNotCovered) * 100;
      } else {
        scanResult['coverage'] = 0;
      }
    }
  } else {
    for (const scanResult of results){
      scanResult['coverage'] = 0;
    }
  }


}
