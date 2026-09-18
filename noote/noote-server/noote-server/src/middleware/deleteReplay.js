const SyncOperation = require("../models/SyncOperation");

const RESOURCE_BY_PATH = { notes: "notes", tasks: "tasks", reminders: "reminders", events: "events" };

function deleteReplay(req, res, next) {
  if (req.method !== "DELETE") return next();
  const parts = req.path.split("/").filter(Boolean);
  if (parts.length !== 1 || !req.body?.operationId || !req.user) return next();
  const resource = RESOURCE_BY_PATH[req.baseUrl.split("/").filter(Boolean).pop()];
  if (!resource) return next();

  SyncOperation.findOne({ operationId: req.body.operationId, owner: req.user.id, organization: req.user.organization })
    .then((existing) => {
      if (existing) return res.status(existing.status).json(existing.response);
      const originalJson = res.json.bind(res);
      res.json = async (payload) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          await SyncOperation.updateOne(
            { operationId: req.body.operationId, owner: req.user.id, organization: req.user.organization },
            { $setOnInsert: { operationId: req.body.operationId, owner: req.user.id, organization: req.user.organization, resource, resourceId: parts[0], method: "DELETE", status: res.statusCode, response: payload } },
            { upsert: true }
          );
        }
        return originalJson(payload);
      };
      return next();
    })
    .catch(next);
}

module.exports = { deleteReplay };
