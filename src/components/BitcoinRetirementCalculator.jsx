import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Utility functions
const generateGrowthRates = (initialRate, terminalRate, years) => {
  const rates = [];
  const decay = (initialRate - terminalRate) / years;
  
  for (let year = 1; year <= years; year++) {
    const rate = Math.max(terminalRate, initialRate - (decay * (year - 1)));
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

// Input Field Component
const InputField = ({ label, value, onChange, type = "number", disabled = false, initialValue }) => {
  const [inputValue, setInputValue] = useState(formatNumber(initialValue || value || 0));

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
      <label className="block text-sm font-medium mb-1 text-gray-900">{label}</label>
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

// Growth Rates Display Component
const GrowthRatesDisplay = ({ growthRates }) => (
  <div className="mb-6">
    <h3 className="text-lg font-medium mb-2 text-gray-900">Scaling Growth Rates</h3>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
      {growthRates.map(({ year, rate }) => (
        <div key={year} className="text-sm bg-gray-50 p-2 rounded text-gray-900">
          Year {year}: {rate}%
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
          <th className="text-left p-2 text-xs font-medium text-gray-700 uppercase tracking-wider">Year</th>
          <th className="text-right p-2 text-xs font-medium text-gray-700 uppercase tracking-wider">Growth Rate</th>
          <th className="text-right p-2 text-xs font-medium text-gray-700 uppercase tracking-wider">Bitcoin Price</th>
          <th className="text-right p-2 text-xs font-medium text-gray-700 uppercase tracking-wider">Portfolio Value</th>
          <th className="text-right p-2 text-xs font-medium text-gray-700 uppercase tracking-wider">Total Debt</th>
          <th className="text-right p-2 text-xs font-medium text-gray-700 uppercase tracking-wider">Net Worth</th>
          <th className="text-right p-2 text-xs font-medium text-gray-700 uppercase tracking-wider">LTV Ratio</th>
          <th className="text-right p-2 text-xs font-medium text-gray-700 uppercase tracking-wider">Annual Expenses</th>
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
          />
          <InputField 
            label="Bitcoin Price (USD)"
            value={inputs.bitcoinPrice}
            onChange={handleInputChange('bitcoinPrice')}
            initialValue={inputs.bitcoinPrice}
          />
          <div>
            <InputField 
              label="Annual Expenses (USD)"
              value={useOptimalExpenses ? optimalExpenses : inputs.annualExpenses}
              onChange={handleInputChange('annualExpenses')}
              disabled={useOptimalExpenses}
              initialValue={inputs.annualExpenses}
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
          />
          <InputField 
            label="Years"
            value={inputs.years}
            onChange={handleInputChange('years')}
            initialValue={inputs.years}
          />
          <InputField 
            label="Inflation Rate (%)"
            value={inputs.inflationRate}
            onChange={handleInputChange('inflationRate')}
            initialValue={inputs.inflationRate}
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
            />
            <InputField 
              label="Terminal Growth Rate (%)"
              value={inputs.terminalGrowthRate}
              onChange={handleInputChange('terminalGrowthRate')}
              initialValue={inputs.terminalGrowthRate}
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
                <YAxis />
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
