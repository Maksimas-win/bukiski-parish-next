import { WEB_UI } from './web-i18n.js?v=e8fc9cdf22';

export const CLAUDE_POLICY = {
  ru: 'Для Anthropic (Claude) данные API обычно удаляются в течение 30 дней. Исключения возможны для безопасности и исполнения закона. Очистка диалога на сайте не удаляет копии у провайдера.',
  lt: 'Anthropic (Claude) API duomenys paprastai ištrinami per 30 dienų. Saugumo ir teisinių prievolių vykdymo tikslais galimos išimtys. Pokalbio išvalymas svetainėje neištrina paslaugos teikėjo turimų kopijų.',
  en: 'Anthropic (Claude) normally deletes API data within 30 days. Exceptions may apply for safety and legal requirements. Clearing the website chat does not delete copies held by the provider.',
  pl: 'Anthropic (Claude) zwykle usuwa dane API w ciągu 30 dni. Możliwe są wyjątki związane z bezpieczeństwem i wymogami prawa. Wyczyszczenie rozmowy na stronie nie usuwa kopii u dostawcy.',
  de: 'Anthropic (Claude) löscht API-Daten normalerweise innerhalb von 30 Tagen. Ausnahmen sind aus Sicherheitsgründen und aufgrund gesetzlicher Vorgaben möglich. Das Leeren des Website-Chats löscht keine Kopien beim Anbieter.',
  uk: 'Anthropic (Claude) зазвичай видаляє дані API протягом 30 днів. Можливі винятки з міркувань безпеки та вимог закону. Очищення діалогу на сайті не видаляє копії у провайдера.'
};

export function providerCopy(language, provider) {
  const copy = WEB_UI[language];
  if (provider === 'openai') {return copy;}
  if (provider !== 'anthropic') {throw new Error('provider');}
  const start = copy.policy.lastIndexOf(language === 'ru' ? 'Для OpenAI' : 'OpenAI');
  if (start < 0) {throw new Error('policy');}
  return { ...copy, consent: copy.consent.replace('OpenAI', 'Anthropic (Claude)'),
    policy: copy.policy.slice(0, start) + CLAUDE_POLICY[language] };
}

export function allProviderPolicy(language) {
  return WEB_UI[language].policy + '\n\n' + CLAUDE_POLICY[language];
}
