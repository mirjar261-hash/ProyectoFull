export const formatInternalAuthToken = (token?: string | null): string | null => {
  if (!token) {
    return null;
  }

  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

export const getInternalAuthHeaders = (
  token?: string | null,
  extraHeaders: Record<string, string> = {},
): Record<string, string> | undefined => {
  const authToken = formatInternalAuthToken(token);

  if (!authToken) {
    return undefined;
  }

  return { Authorization: authToken, ...extraHeaders };
};
