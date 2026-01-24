module.exports = {
	forbidden: [
		{
			name: "domain-depends-on-outer-layer",
			comment: "ドメイン層は外側の層に依存しない",
			severity: "error",
			from: { path: "^src/domain" },
			to: { path: "^src/(controller|infrastructre|services)" },
		},
		{
			name: "services-depend-on-controller",
			comment: "ユースケース層はプレゼンテーション層に依存しない",
			severity: "error",
			from: { path: "^src/services" },
			to: { path: "^src/controller" },
		},
		{
			name: "services-depend-on-infrastructure",
			comment: "ユースケース層はインフラ層に依存しない",
			severity: "error",
			from: { path: "^src/services" },
			to: { path: "^src/infrastructre" },
		},
		{
			name: "infrastructure-depend-on-controller",
			comment: "インフラ層はプレゼンテーション層に依存しない",
			severity: "error",
			from: { path: "^src/infrastructre" },
			to: { path: "^src/controller" },
		},
	],
	options: {
		doNotFollow: {
			path: "node_modules",
		},
		tsConfig: {
			fileName: "tsconfig.json",
		},
	},
};
