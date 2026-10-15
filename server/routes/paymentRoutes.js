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


      const stripePrice =
        await stripe.prices.retrieve(stripePriceId);

      if (
        !stripePrice.active ||
        stripePrice.type !== "one_time" ||
        stripePrice.currency !== "usd" ||
        !Number.isSafeInteger(stripePrice.unit_amount) ||
        stripePrice.unit_amount <= 0
      ) {
        return res.status(503).json({
          success: false,
          message:
            "The configured service price is not available for checkout."
        });
      }

      const expectedAmountTotal =
        stripePrice.unit_amount;

      const expectedCurrency = "usd";

      payment =
        await Payment.create({
          user:
            req.user.id,

          serviceKey,

          serviceName:
            serviceOption
              .serviceName,


              status: "pending",

              amountTotal: expectedAmountTotal,

              currency: expectedCurrency,

              checkoutCreatedAt: new Date()

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
          await Payment.updateOne(
            {
              _id: payment._id,
              status: "pending"
            },
            {
              $set: {
                status: "failed"
              }
            }
          );
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

    const paymentFilter = {
      _id: paymentId,
      user: userId,
      stripeCheckoutSessionId: session.id
    };

    const isSuccessfulPayment =
      event.type ===
        "checkout.session.async_payment_succeeded" ||
      (
        event.type ===
          "checkout.session.completed" &&
        session.payment_status === "paid"
      );

    const isFailedPayment =
      event.type ===
      "checkout.session.async_payment_failed";

    const isExpiredPayment =
      event.type ===
      "checkout.session.expired";

    const isPendingCompletion =
      event.type ===
        "checkout.session.completed" &&
      session.payment_status !== "paid";

    const amountTotal =
      Number.isInteger(session.amount_total) &&
      session.amount_total >= 0
        ? session.amount_total
        : undefined;

    const currency =
      typeof session.currency === "string"
        ? session.currency.trim().toLowerCase()
        : undefined;

    const paymentIntentId =
      getPaymentIntentId(
        session.payment_intent
      );


    const expectedPayment =
      await Payment.findOne(paymentFilter)
        .select("status amountTotal currency paidAt")
        .lean();

    if (!expectedPayment) {
      console.error(
        "Stripe webhook payment record not found:",
        {
          eventId: event.id,
          sessionId: session.id
        }
      );

      return res.status(500).json({
        success: false,
        message: "Payment reconciliation is pending."
      });
    }

    if (
      !Number.isSafeInteger(expectedPayment.amountTotal) ||
      expectedPayment.amountTotal <= 0 ||
      expectedPayment.currency !== "usd" ||
      amountTotal !== expectedPayment.amountTotal ||
      currency !== expectedPayment.currency
    ) {
      console.error(
        "Stripe webhook payment amount or currency mismatch:",
        {
          eventId: event.id,
          paymentId,
          sessionId: session.id
        }
      );

      return res.status(500).json({
        success: false,
        message: "Payment reconciliation requires review."
      });
    }

    if (
      isSuccessfulPayment &&
      expectedPayment.status !== "pending" &&
      expectedPayment.status !== "paid"
    ) {
      console.error(
        "Stripe webhook unexpected successful payment transition:",
        {
          eventId: event.id,
          paymentId,
          currentStatus: expectedPayment.status
        }
      );

      return res.status(500).json({
        success: false,
        message: "Payment state requires reconciliation."
      });
    }


    const paymentDetails = {};

    if (paymentIntentId) {
      paymentDetails.stripePaymentIntentId =
        paymentIntentId;
    }


    let updatedPayment = null;

    if (isSuccessfulPayment) {
      updatedPayment =
        await Payment.findOneAndUpdate(
          {
            ...paymentFilter,

            status: "pending"

          },
          {
            $set: {
              ...paymentDetails,
              status: "paid",
              paidAt: new Date()
            }
          },
          {
            new: true,
            runValidators: true
          }
        );
    } else if (isFailedPayment) {
      updatedPayment =
        await Payment.findOneAndUpdate(
          {
            ...paymentFilter,
            status: "pending"
          },
          {
            $set: {
              ...paymentDetails,
              status: "failed"
            }
          },
          {
            new: true,
            runValidators: true
          }
        );
    } else if (isExpiredPayment) {
      updatedPayment =
        await Payment.findOneAndUpdate(
          {
            ...paymentFilter,
            status: "pending"
          },
          {
            $set: {
              ...paymentDetails,
              status: "expired"
            }
          },
          {
            new: true,
            runValidators: true
          }
        );
    } else if (isPendingCompletion) {
      updatedPayment =
        await Payment.findOneAndUpdate(
          {
            ...paymentFilter,
            status: "pending"
          },
          {
            $set: paymentDetails
          },
          {
            new: true,
            runValidators: true
          }
        );
    }

    if (!updatedPayment) {
      const existingPayment =
        await Payment.findOne(
          paymentFilter
        )
          .select("status paidAt")
          .lean();

      if (!existingPayment) {
        console.error(
          "Stripe webhook payment record not found:",
          {
            eventId: event.id,
            eventType: event.type,
            sessionId: session.id
          }
        );

        return res
          .status(500)
          .json({
            success: false,
            message:
              "Payment record reconciliation is pending."
          });
      }

      console.info(
        "Stripe webhook event required no payment state change:",
        {
          eventId: event.id,
          eventType: event.type,
          paymentId,
          currentStatus: existingPayment.status
        }
      );
    } else {
      console.info(
        "Stripe webhook payment state updated:",
        {
          eventId: event.id,
          eventType: event.type,
          paymentId,
          status: updatedPayment.status
        }
      );
    }

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
