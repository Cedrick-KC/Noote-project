const Task = require("../models/Task");
const { requireAuth } = require("./auth");

/* Narrow guard for replayed and stale task mutations. Existing route validation,
authorization, population, audit logging, and recurrence behavior remain intact. */
function taskSyncGuard(req, res, next) {
  return requireAuth(req, res, async () => {
    if (!["POST", "PATCH", "DELETE"].includes(req.method)) return next();

    if (req.method === "POST" && req.path === "/") {
      const operationId = req.body?.operationId;
      if (!operationId) return next();
      const existing = await Task.findOne({ operationId, organization: req.user.organization });
      if (existing) return res.status(200).json(existing);

      const sendJson = res.json.bind(res);
      res.json = async (payload) => {
        const id = payload?._id || payload?.id;
        if (id) await Task.updateOne({ _id: id, organization: req.user.organization }, { $set: { operationId } });
        return sendJson(payload);
      };
      return next();
    }

    if (!req.params.id) return next();
    const task = await Task.findOne({ _id: req.params.id, organization: req.user.organization });
    if (!task) return next();

    const { operationId, expectedVersion } = req.body || {};
    if (operationId && task.operationId === operationId) return res.status(200).json(task);
    if (expectedVersion !== undefined && Number(expectedVersion) !== task.version) {
      return res.status(409).json({ error: "Task changed on another device", conflict: true, server: task });
    }

    return next();
  });
}

module.exports = { taskSyncGuard };
