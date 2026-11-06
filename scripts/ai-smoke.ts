/**
 * Teste da IA configurada no servidor com os dados reais (sem passar pelo login).
 * Uso (no container): npx tsx scripts/ai-smoke.ts [chat|report] [orgId] [ano] ["pergunta"]
 */
import { storage } from '../src/server/storage';
import { scopeMeasurements, scopeTargets } from '../src/services/orgScope';
import { executeRAGChatQuery, generateGeminiAnnualReport } from '../src/server/geminiService';
import { buildFiveYearHistoricalSeries } from '../src/services/historicalAnalytics';
import { defaultAIProvider } from '../src/server/localLLM';

const [mode = 'chat', orgId = 'org-sjrr', yearArg = '2025', question = 'Qual foi o consumo de energia elétrica no exercício e como ele se compara com a meta?'] = process.argv.slice(2);
const year = Number(yearArg);

await storage.init();
const db = storage.getDatabase();
const org = db.organizations.find(o => o.id === orgId)!;
const measurements = scopeMeasurements(orgId, db.measurements, db.indicators, db.organizations);
const targets = scopeTargets(orgId, db.targets);
const alerts = db.alerts.filter(a => !a.organizationId || a.organizationId === orgId);
const t0 = Date.now();

if (mode === 'chat') {
  const msg = await executeRAGChatQuery({
    query: question,
    provider: defaultAIProvider(),
    context: {
      organizationName: org.name, organizationId: org.id, year,
      indicators: db.indicators, measurements, targets,
      actionPlans: db.actionPlans.filter(a => a.organizationId === orgId), documents: [], alerts
    }
  });
  console.log(`\n=== ${msg.modelUsed} · ${((Date.now() - t0) / 1000).toFixed(1)} s ===\n`);
  console.log(msg.text);
} else {
  const series = buildFiveYearHistoricalSeries(db.indicators, measurements, targets, year);
  const r = await generateGeminiAnnualReport({
    organizationName: org.name, year, indicators: db.indicators, measurements, targets,
    actionPlans: db.actionPlans.filter(a => a.organizationId === orgId), alerts,
    fiveYearSeries: series, provider: defaultAIProvider()
  });
  console.log(`\n=== ${r.aiModel} · ${((Date.now() - t0) / 1000).toFixed(1)} s · ${r.sections.length} seções ===\n`);
  console.log('RESUMO:', r.executiveSummary);
  console.log('\nCONQUISTAS:', JSON.stringify(r.keyAchievements, null, 1));
  console.log('\nALERTAS:', JSON.stringify(r.criticalAlerts, null, 1));
  console.log('\nSEÇÃO 3:', r.sections[2]?.content?.slice(0, 1500));
}
process.exit(0);
