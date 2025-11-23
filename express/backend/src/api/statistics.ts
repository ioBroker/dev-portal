import { Router } from "express";
import { Document } from "mongodb";
import { dbConnect } from "../db/utils";

const router = Router();

const availableFields = {
	owner: 1,

	// ioPackage fields
	tier: "$ioPackage.common.tier",
	mode: "$ioPackage.common.mode",
	type: "$ioPackage.common.type",
	compact: "$ioPackage.common.compact",
	connectionType: "$ioPackage.common.connectionType",
	dataSource: "$ioPackage.common.dataSource",
	adminUiConfig: "$ioPackage.common.adminUI.config",
	adminUiTab: "$ioPackage.common.adminUI.tab",
	depJsController: "$ioPackage.common.dependencies.js-controller",
	depAdmin: "$ioPackage.common.globalDependencies.admin",

	// adapter creator fields
	target: "$createAdapter.target",
	quotes: "$createAdapter.quotes",
	indentation: "$createAdapter.indentation",
	connectionIndicator: "$createAdapter.connectionIndicator",
	language: "$createAdapter.language",
	nodeVersion: "$createAdapter.nodeVersion",
	creatorVersion: "$createAdapter.creatorVersion",
	dependabot: "$createAdapter.dependabot",
	releaseScript: "$createAdapter.releaseScript",

	// computed fields
	publishState: {
		$cond: [
			{
				$gt: [
					{
						$size: {
							$filter: {
								input: "$repo-adapters",
								as: "ra",
								cond: {
									$eq: ["$$ra.source", "stable"],
								},
							},
						},
					},
					0,
				],
			},
			"stable",
			{
				$cond: [
					{
						$gt: [
							{
								$size: {
									$filter: {
										input: "$repo-adapters",
										as: "ra",
										cond: {
											$eq: ["$$ra.source", "latest"],
										},
									},
								},
							},
							0,
						],
					},
					"latest",
					{
						$cond: [
							{
								$gt: ["$npmMetadata", null],
							},
							"npm",
							"github",
						],
					},
				],
			},
		],
	},
} as const;

router.get("/api/statistics", async function (req, res) {
	const db = await dbConnect();
	const repos = db.gitHubRepos();

	const statsToInclude =
		((req.query.stats as string)?.split(
			",",
		) as (keyof typeof availableFields)[]) ?? [];

	const pipeline: Document[] = [
		{
			$match: {
				valid: true,
			},
		},
	];
	if (statsToInclude.includes("publishState")) {
		pipeline.push({
			$lookup: {
				as: "repo-adapters",
				from: "repo-adapters",
				foreignField: "name",
				localField: "adapterName",
			},
		});
	}

	const $project: Record<string, any> = {
		_id: 0,
	};
	for (const field in statsToInclude) {
		if (availableFields.hasOwnProperty(statsToInclude[field])) {
			$project[statsToInclude[field]] =
				availableFields[statsToInclude[field]];
		}
	}
	pipeline.push({
		$project,
	});

	const stream = repos.aggregate(pipeline).stream();

	const stats = new Map<string, Map<string, number>>();
	for await (const doc of stream) {
		for (const [key, value] of Object.entries(doc)) {
			if (!stats.has(key)) {
				stats.set(key, new Map<string, number>());
			}
			const valString = String(value);
			const stat = stats.get(key)!;
			const oldValue = stat.get(valString) || 0;
			stat.set(valString, oldValue + 1);
		}
	}

	const result: Record<string, Record<string, number>> = {};
	for (const [key, stat] of stats.entries()) {
		result[key] = {};
		for (const [value, count] of stat.entries()) {
			result[key][value] = count;
		}
	}

	res.send(result);
});

export default router;
