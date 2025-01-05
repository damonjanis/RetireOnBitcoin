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
  let bitcoinValue = inputs.bitcoinPrice;

  for (let i = 0; i < inputs.years; i++) {
    const year = i + 1;
    
    // First calculate debt at start of year
    totalBorrowed += inflatedExpenses;
    totalInterest += totalBorrowed * (inputs.interestRate/100);
    
    const portfolioValue = bitcoinValue * inputs.bitcoinAmount;
    const totalDebt = totalBorrowed + totalInterest;
    const netWorth = portfolioValue - totalDebt;
    const ltvRatio = (totalDebt / portfolioValue) * 100;

    // Get growth rate for this year
    const growthRate = inputs.growthRates.find(g => g.year === year)?.rate || 
      inputs.growthRates[inputs.growthRates.length - 1].rate;

    // Apply growth for next year's starting price
    const nextBitcoinValue = bitcoinValue * (1 + growthRate/100);

    projections.push({
      year,
      growthRate,
      bitcoinPrice: Math.round(i === 0 ? bitcoinValue : nextBitcoinValue),
      portfolioValue: Math.round(portfolioValue),
      totalBorrowed: Math.round(totalBorrowed),
      totalInterest: Math.round(totalInterest),
      totalDebt: Math.round(totalDebt),
      netWorth: Math.round(netWorth),
      ltvRatio: Math.round(ltvRatio * 100) / 100,
      annualExpenses: Math.round(inflatedExpenses)
    });

    // Update bitcoinValue for next iteration
    bitcoinValue = nextBitcoinValue;

    // Increase expenses by inflation rate for next year
    inflatedExpenses *= (1 + inputs.inflationRate/100);
  }

  return projections;
};

const findOptimalAnnualExpenses = (inputs) => {
  let low = 0;
  let high = inputs.bitcoinPrice * inputs.bitcoinAmount;
  let optimalExpenses = 0;
  const maxLTV = inputs.maxLTV || 50; // Use custom maxLTV or default to 50
  const PRECISION = 100;

  while (high - low > PRECISION) {
    const mid = (low + high) / 2;
    const projections = calculateProjections({ ...inputs, annualExpenses: mid });
    const maxLTVInProjections = Math.max(...projections.map(p => p.ltvRatio));

    if (maxLTVInProjections <= maxLTV) {
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
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0, align: 'center' });
  const tooltipRef = useRef(null);

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

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const isMobile = windowWidth <= 640; // sm breakpoint
    
    // For mobile, check if we're too close to the right edge
    if (isMobile && rect.right > windowWidth - 100) {
      setTooltipPosition({
        x: rect.left - 10,
        y: rect.top + rect.height / 2,
        align: 'right'
      });
    } else {
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
        align: 'center'
      });
    }
    setShowTooltip(true);
  };

  return (
    <div className="relative mb-3 sm:mb-4 w-full">
      <div className="flex items-center gap-2 mb-1.5">
        <label className="block text-sm sm:text-base font-medium text-gray-900 truncate flex-grow">{label}</label>
        <div className="relative inline-block">
          <div
            className="cursor-help"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
      <input
        type="text"
        inputMode="decimal"
        value={inputValue}
        onChange={handleChange}
        onFocus={(e) => e.target.select()}
        disabled={disabled}
        className="w-full px-3 py-2 text-base sm:text-lg border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-gray-900"
      />
      {showTooltip && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: tooltipPosition.align === 'center' 
              ? 'translate(-50%, -100%)' 
              : 'translate(-100%, -50%)',
          }}
          className="px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-[100] w-48 sm:w-56 normal-case"
        >
          {tooltip}
          {tooltipPosition.align === 'center' ? (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-8 border-transparent border-t-gray-900" />
          ) : (
            <div className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 border-8 border-transparent border-l-gray-900" />
          )}
        </div>
      )}
    </div>
  );
};

// Column header with tooltip component
const ColumnHeader = ({ label, tooltip, className }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0, align: 'center' });
  const tooltipRef = useRef(null);

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const isMobile = windowWidth <= 640; // sm breakpoint
    
    // For mobile, check if we're too close to the right edge
    if (isMobile && rect.right > windowWidth - 100) {
      setTooltipPosition({
        x: rect.left - 10,
        y: rect.top + rect.height / 2,
        align: 'right'
      });
    } else {
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
        align: 'center'
      });
    }
    setShowTooltip(true);
  };
  
  return (
    <th className={`text-right p-2 text-xs font-medium text-gray-700 uppercase tracking-wider ${className}`}>
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
            transform: tooltipPosition.align === 'center' 
              ? 'translate(-50%, -100%)' 
              : 'translate(-100%, -50%)',
          }}
          className="px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-[100] w-48 normal-case"
        >
          {tooltip}
          {tooltipPosition.align === 'center' ? (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-8 border-transparent border-t-gray-900" />
          ) : (
            <div className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 border-8 border-transparent border-l-gray-900" />
          )}
        </div>
      )}
    </th>
  );
};

// Growth Rates Display Component
const GrowthRatesDisplay = ({ growthRates }) => {
  const [showAllYears, setShowAllYears] = useState(false);
  const scrollRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 640px)').matches);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const displayedRates = useMemo(() => {
    if (!isMobile || showAllYears) return growthRates;
    return growthRates.slice(0, 10); // Only show first 10 years by default on mobile
  }, [growthRates, showAllYears, isMobile]);

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <h3 className="text-lg font-semibold text-gray-900">Growth Rate Schedule</h3>
        <div className="text-sm text-gray-500">
          Initial: {growthRates[0]?.rate}% → Terminal: {growthRates[9]?.rate}%
        </div>
      </div>
      
      <div className="relative">
        <div 
          ref={scrollRef}
          className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar"
        >
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 bg-white p-4 rounded-xl shadow-sm min-w-[600px] sm:min-w-0">
            {displayedRates.map(({ year, rate }, index) => (
              <div 
                key={year}
                className={`relative p-3 rounded-lg ${
                  index === 9 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                }`}
              >
                <div className="text-xs font-medium text-gray-500 mb-1">Year {year}</div>
                <div className={`text-base sm:text-lg font-semibold ${
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
        
        {/* Scroll indicators - only show on mobile */}
        {isMobile && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white to-transparent pointer-events-none" />
          </>
        )}
      </div>

      {/* Show/Hide years button - only show on mobile */}
      {isMobile && growthRates.length > 10 && (
        <div className="mt-4">
          <button
            onClick={() => setShowAllYears(!showAllYears)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showAllYears ? 'Show Less Years' : 'Show All 20 Years'}
          </button>
        </div>
      )}

      {/* Mobile scroll hint - only show on mobile */}
      {isMobile && (
        <div className="mt-2 text-xs text-gray-400 text-center">
          Swipe to see more years →
        </div>
      )}
    </div>
  );
};

// Results Table Component
const ResultsTable = ({ results }) => {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef(null);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  return (
    <div className="relative mb-6">
      {/* Scroll Indicators */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
      )}
      
      {/* Mobile Scroll Hint */}
      <div className="md:hidden text-sm text-gray-500 mb-2 text-center">
        Swipe horizontally to view more data
      </div>

      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto rounded-lg shadow overscroll-x-contain"
        onScroll={checkScroll}
      >
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <ColumnHeader 
                  label="Year" 
                  tooltip="Each year of the strategy, starting from Year 1. Loans are taken at the start of each year, before Bitcoin price growth"
                  className="text-xs sm:text-[11px] md:text-sm"
                />
                <ColumnHeader 
                  label="Growth" 
                  tooltip="Bitcoin's expected price growth rate for this year, applied after the loan is taken"
                  className="text-xs sm:text-[11px] md:text-sm"
                />
                <ColumnHeader 
                  label="BTC Price" 
                  tooltip="Bitcoin price used for calculations. Year 1 shows starting price, subsequent years show price after previous year's growth"
                  className="text-xs sm:text-[11px] md:text-sm"
                />
                <ColumnHeader 
                  label="Portfolio" 
                  tooltip="Total value of your Bitcoin holdings (Bitcoin Amount × Bitcoin Price)"
                  className="text-xs sm:text-[11px] md:text-sm"
                />
                <ColumnHeader 
                  label="Debt" 
                  tooltip="Cumulative borrowed amount plus interest. This is what you owe from borrowing for living expenses"
                  className="text-xs sm:text-[11px] md:text-sm"
                />
                <ColumnHeader 
                  label="Net Worth" 
                  tooltip="Portfolio Value minus Total Debt. This is your actual wealth after accounting for loans"
                  className="text-xs sm:text-[11px] md:text-sm"
                />
                <ColumnHeader 
                  label="LTV" 
                  tooltip="Loan-to-Value ratio calculated at the start of each year before Bitcoin appreciation. This represents the highest LTV for the year"
                  className="text-xs sm:text-[11px] md:text-sm"
                />
                <ColumnHeader 
                  label="Expenses" 
                  tooltip="Living expenses for this year, increasing yearly with inflation"
                  className="text-xs sm:text-[11px] md:text-sm"
                />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((row, index) => (
                <tr 
                  key={row.year} 
                  className={`hover:bg-gray-50 text-gray-900 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="sticky left-0 bg-inherit whitespace-nowrap py-1.5 px-2 sm:py-2 sm:px-2 md:py-2 md:px-3 text-xs sm:text-[11px] md:text-sm font-medium border-r border-gray-200">
                    {row.year === 'Today' ? 'Today' : row.year}
                  </td>
                  <td className="whitespace-nowrap py-1.5 px-2 sm:py-2 sm:px-2 md:py-2 md:px-3 text-xs sm:text-[11px] md:text-sm text-right">{row.growthRate}%</td>
                  <td className="whitespace-nowrap py-1.5 px-2 sm:py-2 sm:px-2 md:py-2 md:px-3 text-xs sm:text-[11px] md:text-sm text-right">${formatNumber(row.bitcoinPrice)}</td>
                  <td className="whitespace-nowrap py-1.5 px-2 sm:py-2 sm:px-2 md:py-2 md:px-3 text-xs sm:text-[11px] md:text-sm text-right font-medium text-blue-600">${formatNumber(row.portfolioValue)}</td>
                  <td className="whitespace-nowrap py-1.5 px-2 sm:py-2 sm:px-2 md:py-2 md:px-3 text-xs sm:text-[11px] md:text-sm text-right font-medium text-red-600">${formatNumber(row.totalDebt)}</td>
                  <td className="whitespace-nowrap py-1.5 px-2 sm:py-2 sm:px-2 md:py-2 md:px-3 text-xs sm:text-[11px] md:text-sm text-right font-medium text-green-600">${formatNumber(row.netWorth)}</td>
                  <td className="whitespace-nowrap py-1.5 px-2 sm:py-2 sm:px-2 md:py-2 md:px-3 text-xs sm:text-[11px] md:text-sm text-right">{row.ltvRatio}%</td>
                  <td className="whitespace-nowrap py-1.5 px-2 sm:py-2 sm:px-2 md:py-2 md:px-3 text-xs sm:text-[11px] md:text-sm text-right">${formatNumber(row.annualExpenses)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

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
    inflationRate: 3,
    maxLTV: 50 // Add maxLTV to inputs
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
    <div className="flex flex-col items-center w-full max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg w-full mx-auto max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw]">
        <div className="p-4 sm:p-6 md:p-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 text-gray-900 text-center">
            Bitcoin Retirement Calculator (Scaled Growth Model)
          </h2>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
              Bitcoin is the best form of money humans have ever created. Can you retire on Bitcoin? Can you keep your Bitcoin forever? Can you live off it without selling? Yes to all three. This calculator shows you how.
            </p>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed mt-2">
              The strategy is simple: borrow against your Bitcoin, never sell it, pay no capital gains tax. This is how wealthy people have preserved and grown their wealth for centuries using real estate and other appreciating assets.
            </p>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed mt-2">
              Input your Bitcoin holdings and parameters below. The calculator models Bitcoin's price growth over time and can optimize your annual expenses to maintain a safe LTV ratio that you specify. View the results in the chart and table to see your potential wealth growth and sustainable spending level.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mb-6">
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
            <InputField 
              label="Interest Rate (%)"
              value={inputs.interestRate}
              onChange={handleInputChange('interestRate')}
              initialValue={inputs.interestRate}
              tooltip="Annual interest rate on your bitcoin-backed loans. Currently ranges from 5-10% depending on the provider."
            />
            <InputField 
              label="Years"
              value={inputs.years}
              onChange={handleInputChange('years')}
              initialValue={inputs.years}
              tooltip="Number of years to project into the future"
            />
            <InputField 
              label="Initial Growth Rate (%)"
              value={inputs.initialGrowthRate}
              onChange={handleInputChange('initialGrowthRate')}
              initialValue={inputs.initialGrowthRate}
              tooltip="Expected annual growth rate for the first year. This will gradually decrease to the terminal rate."
            />
            <InputField 
              label="Terminal Growth Rate (%)"
              value={inputs.terminalGrowthRate}
              onChange={handleInputChange('terminalGrowthRate')}
              initialValue={inputs.terminalGrowthRate}
              tooltip="Long-term sustainable growth rate that Bitcoin will stabilize at."
            />
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Annual Expenses</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="flex items-center gap-3 cursor-pointer touch-manipulation">
                    <input
                      type="radio"
                      checked={!useOptimalExpenses}
                      onChange={() => setUseOptimalExpenses(false)}
                      className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      name="expensesMode"
                    />
                    <div className="flex-grow">
                      <span className="text-sm font-medium text-gray-900">Manual Entry</span>
                      <p className="text-xs text-gray-500 mt-1">Enter your desired annual expenses manually</p>
                    </div>
                  </label>
                  {!useOptimalExpenses && (
                    <div className="mt-3 ml-7">
                      <InputField 
                        label="Annual Expenses (USD)"
                        value={inputs.annualExpenses}
                        onChange={handleInputChange('annualExpenses')}
                        initialValue={inputs.annualExpenses}
                        tooltip="How much you need each year for living expenses. Think rent/mortgage, food, utilities, etc."
                      />
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <label className="flex items-center gap-3 cursor-pointer touch-manipulation">
                    <input
                      type="radio"
                      checked={useOptimalExpenses}
                      onChange={() => setUseOptimalExpenses(true)}
                      className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      name="expensesMode"
                    />
                    <div className="flex-grow">
                      <span className="text-sm font-medium text-gray-900">Calculate Optimal</span>
                      <p className="text-xs text-gray-500 mt-1">Find the maximum safe spending level based on your max LTV ratio</p>
                    </div>
                  </label>
                  {useOptimalExpenses && (
                    <div className="mt-3 ml-7">
                      <div className="space-y-3">
                        <InputField 
                          label="Max LTV Ratio (%)"
                          value={inputs.maxLTV}
                          onChange={handleInputChange('maxLTV')}
                          initialValue={inputs.maxLTV}
                          tooltip="Maximum Loan-to-Value ratio you're comfortable with. Higher ratios mean more risk but allow higher spending. Recommended to stay at or below 50%."
                        />
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">Optimal Annual Expenses:</span>
                            <span className="text-sm font-semibold text-blue-600">${formatNumber(optimalExpenses)}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            This is the maximum amount you can safely spend each year while keeping your LTV ratio under {inputs.maxLTV}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg mb-6 p-4 md:p-6">
            <GrowthRatesDisplay growthRates={growthRates} />
          </div>

          <div className="mb-6 bg-white rounded-lg shadow p-4 md:p-6">
            <h3 className="text-lg font-medium mb-4 text-gray-900 text-center">Wealth Projection Chart</h3>
            <div className="h-[50vh] min-h-[300px] max-h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={results} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="year" 
                    tick={{ fontSize: 12 }}
                    tickMargin={8}
                  />
                  <YAxis 
                    tickFormatter={formatYAxisTick} 
                    tick={{ fontSize: 12 }}
                    tickMargin={8}
                  />
                  <Tooltip 
                    formatter={(value) => `$${formatNumber(value)}`}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      padding: '0.75rem'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconSize={16}
                    wrapperStyle={{
                      paddingTop: '0.5rem'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="portfolioValue" 
                    name="Portfolio Value" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalDebt" 
                    name="Total Debt" 
                    stroke="#dc2626" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="netWorth" 
                    name="Net Worth" 
                    stroke="#16a34a" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <ResultsTable results={results} />
        </div>
      </div>
    </div>
  );
};

export default BitcoinRetirementCalculator;
