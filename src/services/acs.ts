import {
  CallAutomationClient,
  type CallInvite,
  type TextSource,
} from "@azure/communication-call-automation";
import type { MicrosoftTeamsAppIdentifier } from "@azure/communication-common";

export type AcsConfig = {
  connectionString: string;
  callbackUri: string;
  teamsBotAppId?: string;
  teamsAppTenantId?: string;
  cognitiveServicesEndpoint?: string;
};

export class AcsConfigError extends Error {}
export class AcsCapabilityError extends Error {}

export function loadAcsConfig(): AcsConfig {
  const connectionString = process.env.ACS_CONNECTION_STRING;
  const callbackUri = process.env.ACS_CALLBACK_URI;
  if (!connectionString || !callbackUri) {
    throw new AcsConfigError(
      "ACS_CONNECTION_STRING and ACS_CALLBACK_URI must be set to use ACS Call Automation.",
    );
  }
  return {
    connectionString,
    callbackUri,
    teamsBotAppId: process.env.ACS_TEAMS_BOT_APP_ID || undefined,
    teamsAppTenantId: process.env.ACS_TEAMS_APP_TENANT_ID || undefined,
    cognitiveServicesEndpoint:
      process.env.ACS_COGNITIVE_SERVICES_ENDPOINT || undefined,
  };
}

let clientCache: { config: AcsConfig; client: CallAutomationClient } | null =
  null;

export function getClient(config: AcsConfig): CallAutomationClient {
  if (clientCache && clientCache.config === config) return clientCache.client;
  const client = new CallAutomationClient(config.connectionString);
  clientCache = { config, client };
  return client;
}

export type JoinResult = {
  callConnectionId: string;
  serverCallId?: string;
};

/**
 * 司会君を Teams App identity で会議に参加させる。
 * ACS Call Automation 1.4.0 では Teams meeting link を直接ロケータとして
 * 渡す API がまだ stable に出ていないため、Entra ID 登録した Teams App ID
 * を targetParticipant として createCall する経路を使う。
 */
export async function joinAsTeamsApp(
  config: AcsConfig,
  displayName: string,
): Promise<JoinResult> {
  if (!config.teamsBotAppId) {
    throw new AcsCapabilityError(
      "ACS_TEAMS_BOT_APP_ID is required to join as a Teams app. Register an Entra ID application and grant it the calling bot permissions.",
    );
  }
  const target: MicrosoftTeamsAppIdentifier = {
    teamsAppId: config.teamsBotAppId,
    cloud: "public",
  };
  const invite: CallInvite = {
    targetParticipant: target,
    sourceDisplayName: displayName,
  };
  const client = getClient(config);
  const result = await client.createCall(invite, config.callbackUri, {
    callIntelligenceOptions: config.cognitiveServicesEndpoint
      ? { cognitiveServicesEndpoint: config.cognitiveServicesEndpoint }
      : undefined,
  });
  return {
    callConnectionId: result.callConnectionProperties.callConnectionId!,
    serverCallId: result.callConnectionProperties.serverCallId,
  };
}

export async function playText(
  config: AcsConfig,
  callConnectionId: string,
  text: string,
  voice = "ja-JP-NanamiNeural",
): Promise<void> {
  if (!config.cognitiveServicesEndpoint) {
    throw new AcsCapabilityError(
      "ACS_COGNITIVE_SERVICES_ENDPOINT is required for TextSource playback. Connect a Cognitive Services resource to the ACS resource in the Azure portal.",
    );
  }
  const source: TextSource = {
    kind: "textSource",
    text,
    voiceName: voice,
    sourceLocale: "ja-JP",
  };
  const client = getClient(config);
  const connection = client.getCallConnection(callConnectionId);
  await connection.getCallMedia().playToAll([source]);
}

export async function disconnect(
  config: AcsConfig,
  callConnectionId: string,
): Promise<void> {
  const client = getClient(config);
  const connection = client.getCallConnection(callConnectionId);
  await connection.hangUp(true);
}
