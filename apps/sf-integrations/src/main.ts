import express from "express";
import { z } from "zod";
import { connect } from "amqplib";

const PORT = Number(process.env.PORT ?? 3002);
const RABBIT_URL =
    process.env.RABBIT_URL ?? "amqp://guest:guest@rabbitmq:5672";
const EXCHANGE = process.env.RABBIT_EXCHANGE ?? "sf.events";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) =>
    res.json({ ok: true, service: "sf-integrations" })
);

app.post("/webhooks/:provider", async (req, res) => {
    const schema = z.object({
        event_id: z.string(),
        org_id: z.string(),
        type: z.string(),
        payload: z.any(),
    });

    const body = schema.parse(req.body);
    const provider = req.params.provider;

    const conn = await connect(RABBIT_URL);
    const ch = await conn.createChannel();
    await ch.assertExchange(EXCHANGE, "topic", { durable: true });

    const msg = {
        schema_version: 1,
        occurred_at: new Date().toISOString(),
        provider,
        ...body,
    };

    ch.publish(
        EXCHANGE,
        "alert.received.v1",
        Buffer.from(JSON.stringify(msg)),
        {
            contentType: "application/json",
            messageId: body.event_id,
        }
    );

    await ch.close();
    await conn.close();

    res.json({ ok: true });
});

app.listen(PORT, () => console.log(`sf-integrations listening on :${PORT}`));
