import type { Config } from "tailwindcss";

const config: Config = {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
				mono: ["ui-monospace", "monospace"],
			},
			colors: {
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				main: 'var(--main)',
				bg: 'var(--bg)',
				bw: 'var(--bw)',
				blank: 'var(--blank)',
				border: 'hsl(var(--border))',
				text: 'var(--text)',
				mtext: 'var(--mtext)',
				ring: 'hsl(var(--ring))',
				'ring-offset': 'var(--ring-offset)',
				'secondary-foreground': 'var(--text)',
				'primary-foreground': 'var(--mtext)',
				'muted-foreground': 'var(--text)',
				'card-foreground': 'var(--text)',
				'popover-foreground': 'var(--text)',
				'accent-foreground': 'var(--text)',
				'destructive-foreground': 'var(--text)',
				'chart-1': 'hsl(var(--chart-1))',
				'chart-2': 'hsl(var(--chart-2))',
				'chart-3': 'hsl(var(--chart-3))',
				'chart-4': 'hsl(var(--chart-4))',
				'chart-5': 'hsl(var(--chart-5))',
				primary: {
					DEFAULT: 'var(--main)',
					foreground: 'var(--mtext)'
				},
				secondary: {
					DEFAULT: 'var(--bg)',
					foreground: 'var(--text)'
				},
				muted: {
					DEFAULT: 'var(--bg)',
					foreground: 'var(--text)'
				},
				accent: {
					DEFAULT: 'var(--main)',
					foreground: 'var(--mtext)'
				},
				destructive: {
					DEFAULT: 'var(--main)',
					foreground: 'var(--mtext)'
				},
				input: 'var(--bg)',
				shadow: 'var(--shadow)',
				'reverse-shadow': 'var(--reverse-box-shadow-x) var(--reverse-box-shadow-y) 0px 0px var(--border)',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			boxShadow: {
				'shadow': 'var(--shadow)',
				'reverse': 'var(--reverse-box-shadow-x) var(--reverse-box-shadow-y) 0px 0px var(--border)'
			},
			fontWeight: {
				base: 'var(--base-font-weight)',
				heading: 'var(--heading-font-weight)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
};
export default config;
