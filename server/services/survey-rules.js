export function normalizedSurveyOptions(options) {
  if (!Array.isArray(options)) return [];
  return [...new Set(options.map(option => String(option).trim()).filter(Boolean))];
}

export function canRespondToSurvey(survey, now = new Date()) {
  return survey.status === 'ACTIVE' && (!survey.opensAt || survey.opensAt <= now) && (!survey.closesAt || survey.closesAt > now);
}

export function surveyResults(survey) {
  const counts = new Map(survey.options.map(option => [option.id, 0]));
  for (const response of survey.responses || []) counts.set(response.optionId, (counts.get(response.optionId) || 0) + 1);
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
  return survey.options.map(option => ({ ...option, votes: counts.get(option.id) || 0, percent: total ? Math.round(((counts.get(option.id) || 0) / total) * 100) : 0 }));
}
