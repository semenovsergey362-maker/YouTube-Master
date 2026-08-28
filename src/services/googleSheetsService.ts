import { logger } from "../config/logger";

import { toast } from 'sonner';

declare const google: any;

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let accessToken: string | null = null;
let tokenExpiry: number = 0;

export const getGoogleAccessToken = (clientId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (accessToken && Date.now() < tokenExpiry) {
      resolve(accessToken);
      return;
    }

    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.access_token) {
            accessToken = response.access_token;
            // Token usually expires in 1 hour (3600 seconds)
            tokenExpiry = Date.now() + (response.expires_in * 1000) - 60000; // 1 min buffer
            resolve(response.access_token);
          } else {
            reject(new Error('Failed to get access token: ' + (response.error || 'Unknown error')));
          }
        },
      });
      client.requestAccessToken();
    } catch (error) {
      logger.error('OAuth error:', error);
      reject(error);
    }
  });
};

export const exportToGoogleSheets = async (clientId: string, niche: string, ideas: string[]) => {
  if (!clientId) {
    toast.error('Пожалуйста, настройте Google Client ID в настройках');
    return;
  }

  const toastId = toast.loading('Подключение к Google Sheets...');

  try {
    const token = await getGoogleAccessToken(clientId);
    
    toast.loading('Создание таблицы...', { id: toastId });
    
    // 1. Create a new spreadsheet
    const createResponse = await fetch('https://sheets.googleapis.com/v1/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: `YT Content Ideas: ${niche} (${new Date().toLocaleDateString()})`,
        },
      }),
    });

    if (!createResponse.ok) {
      throw new Error('Не удалось создать таблицу');
    }

    const spreadsheet = await createResponse.json();
    const spreadsheetId = spreadsheet.spreadsheetId;

    // 2. Add headers and ideas
    const values = [
      ['Идея', 'Состояние'],
      ...ideas.map(idea => [idea, 'В работе'])
    ];

    const updateResponse = await fetch(`https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Sheet1!A1:B${values.length}?valueInputOption=RAW`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    });

    if (!updateResponse.ok) {
      throw new Error('Не удалось добавить данные в таблицу');
    }

    toast.success('Идеи успешно экспортированы в Google Sheets!', { id: toastId });
    window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank');
    
  } catch (error: any) {
    logger.error('Sheets export error:', error);
    toast.error(`Ошибка при экспорте: ${error.message}`, { id: toastId });
  }
};
