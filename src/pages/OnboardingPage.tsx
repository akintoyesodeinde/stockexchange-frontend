import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Lock, ShieldCheck, Wallet } from 'lucide-react';
import { useAuth } from '@/features/authentication/AuthContext';
import { api } from '@/services/apiClient';
import { Badge, Button, Card, CardHeader, EmptyState } from '@/components/ui/primitives';
import { formatNGN } from '@/utilities/format';

const RISK_QUESTIONS = [
  { id: 'q1_horizon', label: '1. Expected investment holding period (1=Under 1yr ... 5=10+ yrs)' },
  { id: 'q2_drawdown', label: '2. Comfort with temporary 20% equity market decline (1=Very low ... 5=Very high)' },
  { id: 'q3_liquidity', label: '3. Emergency savings outside equity investments (1=None ... 5=12+ months)' },
  { id: 'q4_experience', label: '4. Prior Nigerian/global equities trading familiarity (1=None ... 5=Extensive)' },
  { id: 'q5_objective', label: '5. Primary goal (1=Capital preservation ... 5=Aggressive growth)' },
];

export function OnboardingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [employment, setEmployment] = useState('EMPLOYED');
  const [incomeBand, setIncomeBand] = useState('NGN 20M - 50M');
  const [sourceOfFunds, setSourceOfFunds] = useState('Salary & Investments');
  const [experience, setExperience] = useState('INTERMEDIATE');
  const [horizon, setHorizon] = useState('5_TO_10_YEARS');
  const [objective, setObjective] = useState('LONG_TERM_CAPITAL_GROWTH');
  const [answers, setAnswers] = useState<Record<string, number>>({
    q1_horizon: 4,
    q2_drawdown: 3,
    q3_liquidity: 4,
    q4_experience: 4,
    q5_objective: 4,
  });
  const [fundAmount, setFundAmount] = useState('500000');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const { data: customer } = useQuery({
    queryKey: ['customer-me'],
    queryFn: () => api.getCustomerMe(),
    enabled: isAuthenticated,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['customer-me'] });
    void queryClient.invalidateQueries({ queryKey: ['portfolios'] });
  };

  const profileMutation = useMutation({
    mutationFn: () =>
      api.saveInvestmentProfile({
        employment_status: employment,
        annual_income_band_ngn: incomeBand,
        source_of_funds: sourceOfFunds,
        investment_experience: experience,
        investment_horizon: horizon,
        investment_objective: objective,
        politically_exposed_person: false,
      }),
    onSuccess: () => {
      setStatusMsg('Investment profile saved.');
      invalidate();
    },
  });

  const riskMutation = useMutation({
    mutationFn: () => api.submitRiskAssessment(answers),
    onSuccess: () => {
      setStatusMsg('Risk assessment scored and persisted.');
      invalidate();
    },
  });

  const consentMutation = useMutation({
    mutationFn: () =>
      api.saveConsents(
        (customer?.required_consents ?? [
          'SANDBOX_DISCLOSURE',
          'RISK_WARNING',
          'MARKET_DATA_TERMS',
          'DATA_PRIVACY_NDPC',
          'BROKERAGE_TERMS',
        ]).map((c) => ({ consent_type: c, version: '1.0', accepted: true })),
      ),
    onSuccess: () => {
      setStatusMsg('All mandatory regulatory & sandbox consents recorded.');
      invalidate();
    },
  });

  const kycMutation = useMutation({
    mutationFn: () => api.verifySandboxKyc('4821'),
    onSuccess: () => {
      setStatusMsg('Simulated KYC & AML clearance verified.');
      invalidate();
    },
  });

  const fundMutation = useMutation({
    mutationFn: () => api.fundSandboxCash(Number(fundAmount)),
    onSuccess: () => {
      setStatusMsg(`Credited ${formatNGN(fundAmount)} virtual sandbox cash via double-entry ledger.`);
      invalidate();
    },
  });

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Sign in for Investment Onboarding & KYC"
        description="Complete suitability profiling, risk assessment, consents, and sandbox funding."
        action={
          <Button variant="primary" onClick={() => navigate('/login')}>
            <Lock className="h-4 w-4" /> Sign In
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#002855] dark:text-white">
            Investment Onboarding, Risk Profiling &amp; KYC
          </h1>
          <p className="text-xs text-slate-500">
            SEC Nigeria / NDPC-inspired sandbox suitability, consent management, and virtual cash funding.
          </p>
        </div>
        {customer && (
          <Badge tone={customer.trading_eligibility.eligible ? 'green' : 'amber'}>
            Trading Eligibility: {customer.trading_eligibility.eligible ? 'ELIGIBLE' : 'PENDING STEPS'}
          </Badge>
        )}
      </div>

      {statusMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4" /> {statusMsg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Step 1: Investment Profile */}
        <Card>
          <CardHeader title="1. Customer Investment Profile" subtitle="Employment, income & horizon" />
          <div className="space-y-3 p-5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-semibold">Employment Status</label>
                <select
                  value={employment}
                  onChange={(e) => setEmployment(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="EMPLOYED">Employed</option>
                  <option value="SELF_EMPLOYED">Self-Employed / Business Owner</option>
                  <option value="RETIRED">Retired</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold">Annual Income Band</label>
                <select
                  value={incomeBand}
                  onChange={(e) => setIncomeBand(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="UNDER NGN 5M">Under NGN 5M</option>
                  <option value="NGN 5M - 20M">NGN 5M - 20M</option>
                  <option value="NGN 20M - 50M">NGN 20M - 50M</option>
                  <option value="ABOVE NGN 50M">Above NGN 50M</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block font-semibold">Source of Funds</label>
              <input
                type="text"
                value={sourceOfFunds}
                onChange={(e) => setSourceOfFunds(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-semibold">Experience</label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold">Horizon</label>
                <select
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="SHORT_TERM">Under 2 Years</option>
                  <option value="MEDIUM_TERM">2 - 5 Years</option>
                  <option value="5_TO_10_YEARS">5 - 10 Years</option>
                  <option value="LONG_TERM">10+ Years</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block font-semibold">Primary Investment Objective</label>
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="CAPITAL_PRESERVATION">Capital Preservation</option>
                <option value="DIVIDEND_INCOME">Dividend Income</option>
                <option value="LONG_TERM_CAPITAL_GROWTH">Long-Term Capital Growth</option>
                <option value="BALANCED_GROWTH_INCOME">Balanced Growth &amp; Income</option>
              </select>
            </div>
            <Button variant="primary" size="sm" onClick={() => profileMutation.mutate()}>
              Save Investment Profile
            </Button>
          </div>
        </Card>

        {/* Step 2: Risk Assessment Questionnaire */}
        <Card>
          <CardHeader
            title="2. Risk Assessment Questionnaire"
            subtitle={
              customer?.risk_assessment
                ? `Current Tier: ${customer.risk_assessment.risk_tier} (${customer.risk_assessment.total_score}/${customer.risk_assessment.max_score})`
                : 'Required before trading'
            }
          />
          <div className="space-y-3 p-5 text-xs">
            {RISK_QUESTIONS.map((rq) => (
              <div key={rq.id} className="flex items-center justify-between gap-3">
                <label className="text-slate-700 dark:text-slate-300">{rq.label}</label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={answers[rq.id] ?? 3}
                  onChange={(e) => setAnswers((a) => ({ ...a, [rq.id]: Number(e.target.value) }))}
                />
                <span className="w-5 text-right font-bold">{answers[rq.id] ?? 3}</span>
              </div>
            ))}
            <Button variant="primary" size="sm" onClick={() => riskMutation.mutate()}>
              Calculate &amp; Save Risk Tier
            </Button>
          </div>
        </Card>

        {/* Step 3: KYC & Consents */}
        <Card>
          <CardHeader
            title="3. KYC Verification &amp; Mandatory Consents"
            action={<ShieldCheck className="h-4 w-4 text-[#D4AF37]" />}
          />
          <div className="space-y-4 p-5 text-xs">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
              <div>
                <div className="font-bold">KYC &amp; AML Screening (Sandbox)</div>
                <div className="text-slate-500">
                  Status: <strong>{customer?.kyc.status ?? 'PENDING'}</strong> • AML:{' '}
                  {customer?.kyc.aml_screening_status ?? 'PENDING'}
                </div>
              </div>
              <Button size="sm" variant="gold" onClick={() => kycMutation.mutate()}>
                Verify Sandbox KYC
              </Button>
            </div>
            <div className="space-y-1.5">
              <div className="font-bold">Required Consents ({customer?.consents.length ?? 0}/5)</div>
              <div className="flex flex-wrap gap-1.5">
                {(customer?.required_consents ?? []).map((ct) => {
                  const accepted = customer?.consents.some((c) => c.consent_type === ct && c.accepted);
                  return (
                    <Badge key={ct} tone={accepted ? 'green' : 'amber'}>
                      {ct.replace(/_/g, ' ')}
                    </Badge>
                  );
                })}
              </div>
              <Button size="sm" variant="primary" className="mt-2" onClick={() => consentMutation.mutate()}>
                Accept All Sandbox Disclosures &amp; Consents
              </Button>
            </div>
          </div>
        </Card>

        {/* Step 4: Sandbox Virtual Funding */}
        <Card>
          <CardHeader
            title="4. Sandbox Investment Account Funding"
            subtitle="Virtual NGN funding only — never debits real bank accounts"
            action={<Wallet className="h-4 w-4 text-emerald-600" />}
          />
          <div className="space-y-3 p-5 text-xs">
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
              <div className="text-slate-500">Current Available Sandbox Cash</div>
              <div className="text-xl font-black tabular-nums text-emerald-600">
                {customer ? formatNGN(customer.investment_account.available_cash) : '—'}
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min={1000}
                max={50000000}
                step={10000}
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm tabular-nums dark:border-slate-700 dark:bg-slate-900"
              />
              <Button variant="success" onClick={() => fundMutation.mutate()}>
                Credit Sandbox NGN
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
