import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Utility functions
const generateGrowthRates = (initialRate, terminalRate, years) => {
  const rates = [];
  const transitionYears = 9; // 9 steps to reach terminal rate at year 10
  const decay = (initialRate - terminalRate) / transitionYears;
  
  for (let year = 1; year <= years; year++) {
    const rate = year < 10 ? 
      Math.max(terminalRate, initialRate - (decay * (year - 1))) :
      terminalRate;
    rates.push({ year, rate: Math.round(rate * 100) / 100 });
  }
  return rates;
};

const calculateProjections = (inputs) => {
  const projections = [];
  let totalBorrowed = 0;
  let totalInterest = 0;
  let inflatedExpenses = inputs.annualExpenses;

  for (let year = 0; year <= inputs.years; year++) {
    const growthRate = year === 0 ? 0 : 
      (inputs.growthRates.find(g => g.year === year)?.rate || inputs.growthRates[inputs.growthRates.length - 1].rate);

    const bitcoinValue = year === 0 ? inputs.bitcoinPrice :
      projections[year - 1].bitcoinPrice * (1 + growthRate/100);
    
    const portfolioValue = bitcoinValue * inputs.bitcoinAmount;
    
    if (year > 0) {
      totalBorrowed += inflatedExpenses;
      totalInterest += totalBorrowed * (inputs.interestRate/100);
      // Increase expenses by inflation rate for next year
      inflatedExpenses *= (1 + inputs.inflationRate/100);
    }

    const totalDebt = totalBorrowed + totalInterest;
    const netWorth = portfolioValue - totalDebt;
    const ltvRatio = (totalDebt / portfolioValue) * 100;

    projections.push({
      year,
      growthRate,
      bitcoinPrice: Math.round(bitcoinValue),
      portfolioValue: Math.round(portfolioValue),
      totalBorrowed: Math.round(totalBorrowed),
      totalInterest: Math.round(totalInterest),
      totalDebt: Math.round(totalDebt),
      netWorth: Math.round(netWorth),
      ltvRatio: Math.round(ltvRatio * 100) / 100,
      annualExpenses: Math.round(inflatedExpenses)
    });
  }

  return projections;
};

const findOptimalAnnualExpenses = (inputs) => {
  let low = 0;
  let high = inputs.bitcoinPrice * inputs.bitcoinAmount;
  let optimalExpenses = 0;
  const TARGET_LTV = 50;
  const PRECISION = 100;

  while (high - low > PRECISION) {
    const mid = (low + high) / 2;
    const projections = calculateProjections({ ...inputs, annualExpenses: mid });
    const maxLTV = Math.max(...projections.map(p => p.ltvRatio));

    if (maxLTV <= TARGET_LTV) {
      optimalExpenses = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.round(optimalExpenses);
};

const formatNumber = (value) => {
  return value.toLocaleString('en-US');
};

const parseFormattedNumber = (value) => {
  return parseFloat(value.replace(/,/g, ''));
};

const formatYAxisTick = (value) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return `$${formatNumber(value)}`;
};

// Input Field Component
const InputField = ({ label, value, onChange, type = "number", disabled = false, initialValue, tooltip }) => {
  const [inputValue, setInputValue] = useState(formatNumber(initialValue || value || 0));
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    setInputValue(formatNumber(value || 0));
  }, [value]);

  const handleChange = (e) => {
    const newValue = e.target.value.replace(/[^\d.,]/g, '');
    setInputValue(newValue);
    
    const parsed = parseFormattedNumber(newValue);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1">
        <label className="block text-sm font-medium text-gray-900">{label}</label>
        <div className="relative inline-block">
          <div
            className="cursor-help"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <svg className="w-4 h-4 text-gray-500 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 w-64 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-10 normal-case">
                <div className="relative">
                  {tooltip}
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 translate-y-full w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onFocus={(e) => e.target.select()}
        disabled={disabled}
        className="w-full p-2 border rounded shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-gray-900"
      />
    </div>
  );
};

// Column header with tooltip component
const ColumnHeader = ({ label, tooltip }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef(null);

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
    setShowTooltip(true);
  };
  
  return (
    <th className="text-right p-2 text-xs font-medium text-gray-700 uppercase tracking-wider">
      <div className="flex items-center justify-end gap-1">
        {label}
        <div className="relative inline-block">
          <div
            className="cursor-help"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <svg className="w-4 h-4 text-gray-500 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
      {showTooltip && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-[100] w-48 normal-case"
        >
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-8 border-transparent border-t-gray-900" />
        </div>
      )}
    </th>
  );
};

// Growth Rates Display Component
const GrowthRatesDisplay = ({ growthRates }) => (
  <div className="mb-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">Growth Rate Schedule</h3>
      <div className="text-sm text-gray-500">
        Initial: {growthRates[0]?.rate}% → Terminal: {growthRates[9]?.rate}%
      </div>
    </div>
    <div className="grid grid-cols-10 gap-1 bg-white p-4 rounded-xl shadow-sm">
      {growthRates.map(({ year, rate }, index) => (
        <div 
          key={year}
          className={`relative p-3 rounded-lg ${
            index === 9 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
          }`}
        >
          <div className="text-xs font-medium text-gray-500 mb-1">Year {year}</div>
          <div className={`text-lg font-semibold ${
            index === 9 ? 'text-blue-600' : 'text-gray-900'
          }`}>
            {rate}%
          </div>
          {index < 9 && (
            <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 text-gray-300">
              →
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

// Results Table Component
const ResultsTable = ({ results }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <ColumnHeader 
            label="Year" 
            tooltip="The year in your retirement timeline, starting from 0 (today)"
          />
          <ColumnHeader 
            label="Growth Rate" 
            tooltip="Bitcoin's expected price growth rate for this year. Transitions from initial to terminal rate over 10 years"
          />
          <ColumnHeader 
            label="Bitcoin Price" 
            tooltip="Projected Bitcoin price based on the growth rate. This determines your portfolio value"
          />
          <ColumnHeader 
            label="Portfolio Value" 
            tooltip="Total value of your Bitcoin holdings (Bitcoin Amount × Bitcoin Price)"
          />
          <ColumnHeader 
            label="Total Debt" 
            tooltip="Cumulative borrowed amount plus interest. This is what you owe from borrowing for living expenses"
          />
          <ColumnHeader 
            label="Net Worth" 
            tooltip="Portfolio Value minus Total Debt. This is your actual wealth after accounting for loans"
          />
          <ColumnHeader 
            label="LTV Ratio" 
            tooltip="Loan-to-Value ratio (Total Debt ÷ Portfolio Value). Should stay under 50% for safety"
          />
          <ColumnHeader 
            label="Annual Expenses" 
            tooltip="Living expenses for this year, increasing yearly with inflation"
          />
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {results.map((row) => (
          <tr key={row.year} className="hover:bg-gray-50 text-gray-900">
            <td className="p-2">{row.year}</td>
            <td className="text-right p-2">{row.growthRate}%</td>
            <td className="text-right p-2">${formatNumber(row.bitcoinPrice)}</td>
            <td className="text-right p-2">${formatNumber(row.portfolioValue)}</td>
            <td className="text-right p-2">${formatNumber(row.totalDebt)}</td>
            <td className="text-right p-2">${formatNumber(row.netWorth)}</td>
            <td className="text-right p-2">{row.ltvRatio}%</td>
            <td className="text-right p-2">${formatNumber(row.annualExpenses)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Main Component
const BitcoinRetirementCalculator = () => {
  const [inputs, setInputs] = useState({
    bitcoinAmount: 3.2,
    bitcoinPrice: 100000,
    annualExpenses: 150000,
    interestRate: 8,
    years: 20,
    initialGrowthRate: 60,
    terminalGrowthRate: 15,
    inflationRate: 3
  });

  const [results, setResults] = useState([]);
  const [useOptimalExpenses, setUseOptimalExpenses] = useState(false);
  const [optimalExpenses, setOptimalExpenses] = useState(0);

  const growthRates = useMemo(() => 
    generateGrowthRates(inputs.initialGrowthRate, inputs.terminalGrowthRate, inputs.years),
    [inputs.initialGrowthRate, inputs.terminalGrowthRate, inputs.years]
  );

  useEffect(() => {
    const calculationInputs = {
      ...inputs,
      growthRates,
      annualExpenses: useOptimalExpenses ? optimalExpenses : inputs.annualExpenses
    };

    if (useOptimalExpenses) {
      const optimal = findOptimalAnnualExpenses({ ...calculationInputs, growthRates });
      setOptimalExpenses(optimal);
      const newResults = calculateProjections({ ...calculationInputs, annualExpenses: optimal });
      setResults(newResults);
    } else {
      const newResults = calculateProjections(calculationInputs);
      setResults(newResults);
    }
  }, [inputs, useOptimalExpenses, growthRates]);

  const handleInputChange = (field) => (value) => {
    setInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Bitcoin Retirement Calculator (Scaled Growth Model)</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <InputField 
            label="Bitcoin Amount"
            value={inputs.bitcoinAmount}
            onChange={handleInputChange('bitcoinAmount')}
            initialValue={inputs.bitcoinAmount}
            tooltip="The number of bitcoins you own or plan to acquire. This is your core retirement asset."
          />
          <InputField 
            label="Bitcoin Price (USD)"
            value={inputs.bitcoinPrice}
            onChange={handleInputChange('bitcoinPrice')}
            initialValue={inputs.bitcoinPrice}
            tooltip="Current or expected bitcoin price in USD. This is your starting point for future price projections."
          />
          <div>
            <InputField 
              label="Annual Expenses (USD)"
              value={useOptimalExpenses ? optimalExpenses : inputs.annualExpenses}
              onChange={handleInputChange('annualExpenses')}
              disabled={useOptimalExpenses}
              initialValue={inputs.annualExpenses}
              tooltip="How much you need each year for living expenses. Think rent/mortgage, food, utilities, etc."
            />
            <div className="mt-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={useOptimalExpenses}
                  onChange={(e) => setUseOptimalExpenses(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-900">Calculate optimal annual expenses (Keep LTV ratio under 50%)</span>
              </label>
              
              {useOptimalExpenses && (
                <div className="bg-blue-50 p-2 rounded mt-2">
                  <p className="text-sm font-medium text-blue-900">
                    Optimal Annual Expenses: ${formatNumber(optimalExpenses)}
                  </p>
                </div>
              )}
            </div>
          </div>
          <InputField 
            label="Interest Rate (%)"
            value={inputs.interestRate}
            onChange={handleInputChange('interestRate')}
            initialValue={inputs.interestRate}
            tooltip="The rate you'll pay on borrowed money. Similar to a home equity loan rate."
          />
          <InputField 
            label="Years"
            value={inputs.years}
            onChange={handleInputChange('years')}
            initialValue={inputs.years}
            tooltip="How many years you want to plan for. Longer timeframes give a better picture of long-term sustainability."
          />
          <InputField 
            label="Inflation Rate (%)"
            value={inputs.inflationRate}
            onChange={handleInputChange('inflationRate')}
            initialValue={inputs.inflationRate}
            tooltip="Expected annual increase in living costs. Historically averages around 2-3% in the US."
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-medium mb-4 text-gray-900">Growth Rate Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField 
              label="Initial Growth Rate (%)"
              value={inputs.initialGrowthRate}
              onChange={handleInputChange('initialGrowthRate')}
              initialValue={inputs.initialGrowthRate}
              tooltip="Expected annual bitcoin price growth rate in early years, higher due to adoption phase. Gradually decreases over 10 years until reaching the terminal rate."
            />
            <InputField 
              label="Terminal Growth Rate (%)"
              value={inputs.terminalGrowthRate}
              onChange={handleInputChange('terminalGrowthRate')}
              initialValue={inputs.terminalGrowthRate}
              tooltip="Long-term growth rate used after year 10. Represents mature market growth."
            />
          </div>
        </div>

        <GrowthRatesDisplay growthRates={growthRates} />
        
        <div className="mb-6">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={results}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={formatYAxisTick} />
                <Tooltip formatter={(value) => `$${formatNumber(value)}`} />
                <Legend />
                <Line type="monotone" dataKey="portfolioValue" name="Portfolio Value" stroke="#2563eb" />
                <Line type="monotone" dataKey="totalDebt" name="Total Debt" stroke="#dc2626" />
                <Line type="monotone" dataKey="netWorth" name="Net Worth" stroke="#16a34a" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <ResultsTable results={results} />
      </div>
    </div>
  );
};

export default BitcoinRetirementCalculator;
