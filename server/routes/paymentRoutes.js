const express =
  require("express");

const Stripe =
  require("stripe");

const protect =
  require(
    "../middleware/authMiddleware"
  );

const {
  requireClient
} = require(
  "../middleware/roleAuthorizationMiddleware"
);

const Payment =
  require(
    "../models/Payment"
  );

const {
  getPaymentServiceOption,
  getStripePriceId,
  getConfiguredPaymentServices
} = require(
  "../constants/paymentOptions"
);

const router =
  express.Router();

function getStripeClient() {
  const secretKey =
    String(
      process.env
        .STRIPE_SECRET_KEY ||
        ""
    ).trim();

  if (!secretKey) {
    throw new Error(
      "Stripe payment processing is not configured."
    );
  }

  return new Stripe(
    secretKey
  );
}

function getFrontendOrigin() {
  const frontendOrigin =
    String(
      process.env
        .FRONTEND_ORIGIN ||
        ""
    )
      .trim()
      .replace(/\/$/, "");

  if (!frontendOrigin) {
    throw new Error(
      "The public frontend origin is not configured."
    );
  }

  return frontendOrigin;
}

function getPaymentIntentId(
  value
) {
  if (
    typeof value === "string"
  ) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    typeof value.id === "string"
  ) {
    return value.id;
  }

  return undefined;
}

router.get(
  "/services",
  protect,
  requireClient,
  (req, res) => {
    return res
      .status(200)
      .json({
        success: true,

        services:
          getConfiguredPaymentServices()
      });
  }
);

router.get(
  "/me",
  protect,
  requireClient,
  async (req, res) => {
    try {
      const requestedLimit =
        Number.parseInt(
          req.query.limit,
          10
        );

      const limit =
        Number.isFinite(
          requestedLimit
        )
          ? Math.min(
              Math.max(
                requestedLimit,
                1
              ),
              25
            )
          : 10;

      const payments =
        await Payment.find({
          user:
            req.user.id
        })
          .sort({
            createdAt: -1,
            _id: -1
          })
          .limit(limit)
          .select(
            "serviceKey serviceName status amountTotal currency checkoutCreatedAt paidAt createdAt updatedAt"
          )
          .lean();

      return res
        .status(200)
        .json({
          success: true,
          payments
        });
    } catch (error) {
      console.error(
        "Client payment history error:",
        error.message
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Payment history is temporarily unavailable."
        });
    }
  }
);

router.post(
  "/checkout-session",
  protect,
  requireClient,
  async (req, res) => {
    let payment = null;

    try {
      const serviceKey =
        String(
          req.body
            .serviceKey ||
            ""
        ).trim();

      const serviceOption =
        getPaymentServiceOption(
          serviceKey
        );

      if (!serviceOption) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Please select an available Mega Financial service."
          });
      }

      const stripePriceId =
        getStripePriceId(
          serviceKey
        );

      if (!stripePriceId) {
        return res
          .status(503)
          .json({
            success: false,

            message:
              "Payment checkout is not configured for that service yet."
          });
      }

      const stripe =
        getStripeClient();

      const frontendOrigin =
        getFrontendOrigin();

      payment =
        await Payment.create({
          user:
            req.user.id,

          serviceKey,

          serviceName:
            serviceOption
              .serviceName,

          status:
            "pending",

          checkoutCreatedAt:
            new Date()
        });

      const metadata = {
        paymentId:
          String(
            payment._id
          ),

        userId:
          String(
            req.user.id
          ),

        serviceKey
      };

      const session =
        await stripe
          .checkout
          .sessions
          .create({
            mode:
              "payment",

            line_items: [
              {
                price:
                  stripePriceId,

                quantity:
                  1
              }
            ],

            customer_email:
              req.user.email,

            client_reference_id:
              String(
                payment._id
              ),

            success_url:
              `${frontendOrigin}/payment.html?checkout=success`,

            cancel_url:
              `${frontendOrigin}/payment.html?checkout=cancelled`,

            metadata,

            payment_intent_data: {
              metadata
            }
          });

      if (
        !session.url ||
        !session.id
      ) {
        throw new Error(
          "Stripe did not return a usable Checkout Session."
        );
      }

      payment
        .stripeCheckoutSessionId =
        session.id;

      await payment.save();

      return res
        .status(201)
        .json({
          success: true,

          checkoutUrl:
            session.url
        });
    } catch (error) {
      if (payment) {
        try {
          payment.status =
            "failed";

          await payment.save();
        } catch (saveError) {
          console.error(
            "Failed checkout record update error:",
            saveError.message
          );
        }
      }

      console.error(
        "Stripe checkout creation error:",
        error.message
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Secure payment checkout is temporarily unavailable."
        });
    }
  }
);

async function handleStripeWebhook(
  req,
  res
) {
  const signature =
    req.headers[
      "stripe-signature"
    ];

  const webhookSecret =
    String(
      process.env
        .STRIPE_WEBHOOK_SECRET ||
        ""
    ).trim();

  if (
    !signature ||
    !webhookSecret
  ) {
    return res
      .status(503)
      .json({
        success: false,

        message:
          "Payment webhook verification is not configured."
      });
  }

  let event;

  try {
    const stripe =
      getStripeClient();

    event =
      stripe.webhooks
        .constructEvent(
          req.body,
          signature,
          webhookSecret
        );
  } catch (error) {
    console.error(
      "Stripe webhook signature error:",
      error.message
    );

    return res
      .status(400)
      .send(
        "Invalid Stripe webhook signature."
      );
  }

  try {
    const handledEvents =
      new Set([
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
        "checkout.session.expired"
      ]);

    if (
      !handledEvents.has(
        event.type
      )
    ) {
      return res
        .status(200)
        .json({
          received: true
        });
    }

    const session =
      event.data.object;

    const paymentId =
      String(
        session.metadata
          ?.paymentId ||
          ""
      ).trim();

    const userId =
      String(
        session.metadata
          ?.userId ||
          ""
      ).trim();

    if (
      !paymentId ||
      !userId ||
      !session.id
    ) {
      return res
        .status(200)
        .json({
          received: true
        });
    }

    const payment =
      await Payment
        .findOne({
          _id:
            paymentId,

          user:
            userId,

          stripeCheckoutSessionId:
            session.id
        })
        .select(
          "+stripeCheckoutSessionId +stripePaymentIntentId"
        );

    if (!payment) {
      return res
        .status(200)
        .json({
          received: true
        });
    }

    payment.amountTotal =
      Number.isInteger(
        session.amount_total
      )
        ? session.amount_total
        : payment.amountTotal;

    payment.currency =
      typeof session.currency ===
      "string"
        ? session.currency
        : payment.currency;

    payment
      .stripePaymentIntentId =
      getPaymentIntentId(
        session
          .payment_intent
      );

    if (
      event.type ===
        "checkout.session.async_payment_succeeded" ||
      (
        event.type ===
          "checkout.session.completed" &&
        session.payment_status ===
          "paid"
      )
    ) {
      payment.status =
        "paid";

      payment.paidAt =
        payment.paidAt ||
        new Date();
    } else if (
      event.type ===
      "checkout.session.async_payment_failed"
    ) {
      payment.status =
        "failed";
    } else if (
      event.type ===
      "checkout.session.expired"
    ) {
      payment.status =
        "expired";
    }

    await payment.save();

    return res
      .status(200)
      .json({
        received: true
      });
  } catch (error) {
    console.error(
      "Stripe webhook processing error:",
      error.message
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Payment webhook processing failed."
      });
  }
}

module.exports = {
  paymentRoutes:
    router,

  handleStripeWebhook
};
