<h1 align="center">⛽ FaisTonPlein</h1>

<p align="center">
    <i>A modern web application that helps you locate gas stations and compare fuel prices in real time. With a smooth interactive map and instant search, find the cheapest option near you in the blink of an eye. 💸</i><br>
    <i>(Only available in France 🇫🇷)</i>
</p>

---

![Next.js 16](https://img.shields.io/badge/Next.js-16-black)
![React 19](https://img.shields.io/badge/React-19-blue)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8)
![DuckDB Wasm](https://img.shields.io/badge/DuckDB-Wasm-yellow)

## 📸 Screenshots

> \_Add screenshots here

## ✨ Features

- **🗺️ Interactive Map**: Visualize gas stations and prices instantly using MapLibre GL.
- **⚡ Real-time Search**: Filter by fuel type (Gazole, SP95, SP98, E10, E85, GPLc) and locate specific stations.
- **💸 Price Comparison**: Easily identify the cheapest stations in your area.
- **🚀 Local-First Architecture**: Powered by **DuckDB Wasm**, allowing high-performance data analysis directly in your browser without server latency.
- **📱 Responsive Design**: A modern, mobile-friendly interface built with **Shadcn UI** and **Tailwind CSS 4**.
- **🌗 Dark Mode**: Seamless support for light and dark themes. (⌛ Coming soon)

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Map**: [mapcn](https://www.mapcn.dev/) - [MapLibre GL](https://maplibre.org/) & [React Map GL](https://visgl.github.io/react-map-gl/)
- **Database (Client-side)**: [DuckDB Wasm](https://duckdb.org/docs/api/wasm/overview) for ultra-fast in-browser SQL queries.
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm/yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/fais-ton-plein.git
   cd fais-ton-plein
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Run the development server**

   ```bash
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application running.

## 📊 Data Source

This project uses open data provided by the French government:

- **Prix des carburants**: [Data.gouv.fr](https://www.data.gouv.fr/datasets/prix-des-carburants-en-france-flux-instantane-v2-amelioree)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 😸 Maintainers

Made with ❤️ by [Baptiste LECHAT](https://github.com/baptistelechat)

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
