# Retire on Bitcoin Calculator

A sophisticated retirement calculator that helps you plan your financial future using Bitcoin as your primary asset. This tool allows you to model a Bitcoin-backed retirement strategy using collateralized loans to generate income while maintaining your Bitcoin position.

## Features

- 📈 Dynamic Bitcoin growth rate modeling with decreasing rates over time
- 💰 Collateralized loan simulation with customizable LTV (Loan-to-Value) ratios
- 📊 Interactive charts showing portfolio value, debt, and LTV projections
- 💵 Optimal annual expense calculator that maintains safe LTV levels
- 📝 Detailed year-by-year projections including:
  - Bitcoin price projections
  - Portfolio value
  - Total debt and interest
  - Net worth
  - LTV ratio
  - Annual expenses adjusted for inflation

## How It Works

The calculator uses a sophisticated model that:
1. Projects Bitcoin's price using a decreasing growth rate model
2. Simulates taking loans against your Bitcoin as collateral
3. Calculates interest accumulation and inflation effects
4. Ensures LTV ratios stay within safe levels
5. Finds the optimal sustainable annual expenses

For detailed technical information, see the "How It Works" section in the calculator interface.

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/damonjanis/RetireOnBitcoin.git
cd RetireOnBitcoin
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Built With

- React
- Vite
- Tailwind CSS
- Recharts

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Disclaimer

This calculator is for educational purposes only. It is not financial advice. Bitcoin prices are highly volatile, and using Bitcoin as collateral carries significant risks. Always do your own research and consult with financial professionals before making investment decisions.
