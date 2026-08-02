const path = require("node:path");
const mongoose = require(path.join(__dirname, "..", "backend", "node_modules", "mongoose"));
const { connectDevelopmentDatabase } = require("./database-runtime");

function summarizePlan(plan) {
  const stages = [];
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (node.stage) {
      stages.push({
        stage: node.stage,
        ...(node.indexName ? { indexName: node.indexName } : {}),
        ...(node.keyPattern ? { keyPattern: node.keyPattern } : {}),
      });
    }
    visit(node.inputStage);
    for (const input of node.inputStages || []) visit(input);
  }
  visit(plan);
  return [...new Map(stages.map((stage) => [JSON.stringify(stage), stage])).values()];
}

async function main() {
  const connection = await connectDevelopmentDatabase();
  const listings = connection.db.collection("listings");
  const feedPlan = await listings.find({
    communityId: new mongoose.Types.ObjectId("650000000000000000000010"),
    status: "active",
    category: "tools",
  }).sort({ createdAt: -1, _id: -1 }).limit(20).explain("executionStats");
  const geoPlan = await listings.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [72.8777, 19.076] },
        distanceField: "distanceMeters",
        spherical: true,
        maxDistance: 20_000,
        query: {
          communityId: new mongoose.Types.ObjectId("650000000000000000000010"),
          status: "active",
        },
      },
    },
    { $sort: { distanceMeters: 1, _id: 1 } },
    { $limit: 20 },
  ]).explain("executionStats");
  const geoCursor = geoPlan.stages?.find((stage) => stage.$geoNearCursor)?.$geoNearCursor;
  console.log(JSON.stringify({
    feed: {
      namespace: feedPlan.queryPlanner.namespace,
      stages: summarizePlan(feedPlan.queryPlanner.winningPlan),
      totalKeysExamined: feedPlan.executionStats.totalKeysExamined,
      totalDocsExamined: feedPlan.executionStats.totalDocsExamined,
      returned: feedPlan.executionStats.nReturned,
    },
    nearby: {
      namespace: geoCursor?.queryPlanner?.namespace,
      stages: summarizePlan(geoCursor?.queryPlanner?.winningPlan),
      totalKeysExamined: geoCursor?.executionStats?.totalKeysExamined,
      totalDocsExamined: geoCursor?.executionStats?.totalDocsExamined,
      returned: geoCursor?.executionStats?.nReturned,
    },
  }, null, 2));
  await connection.close();
}

main().catch((error) => { console.error(`Explain failed: ${error.name}: ${error.message}`); process.exitCode = 1; });
