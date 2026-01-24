const express = require('express');
const axios = require('axios');
const VIPPayment = require('../models/VIPPayment');
const User = require('../models/User');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Initialize Paystack payment
router.post('/initialize-payment', authenticateToken, async (req, res) => {
  try {
    // Get user email from database
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    const { plan, tier } = req.body;

    // Validate required fields
    if (!plan || !tier) {
      return res.status(400).json({
        success: false,
        error: 'Plan and tier are required'
      });
    }

    // Validate tier
    if (!['vip', 'vvip'].includes(tier)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tier. Must be vip or vvip'
      });
    }

    // Validate plan
    if (!['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan. Must be monthly or yearly'
      });
    }

    // Set amount based on tier and plan
    let amount;
    if (tier === 'vvip') {
      amount = plan === 'yearly' ? 500000 : 50000; // 500k yearly, 50k monthly for VVIP
    } else {
      amount = plan === 'yearly' ? 100000 : 10000; // 100k yearly, 10k monthly for VIP
    }

    // Generate unique reference
    const reference = `${tier.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const paystackPayload = {
      email: user.email,
      amount: amount * 100, // Convert to kobo
      reference: reference,
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/vip/success`,
      metadata: {
        user_id: req.user.id,
        type: 'vip_subscription',
        tier: tier,
        plan: plan
      }
    };

    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      paystackPayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Save payment record
    const vipPayment = new VIPPayment({
      user: req.user.id,
      amount,
      reference,
      paystackReference: paystackResponse.data.data.reference,
      tier: tier
    });

    await vipPayment.save();

    res.json({
      success: true,
      data: paystackResponse.data.data
    });
  } catch (error) {
    console.error('Paystack payment initialization error:', error);

    // Return more specific error message
    let errorMessage = 'Failed to initialize payment';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

// Verify payment (webhook)
router.post('/verify-payment', async (req, res) => {
  try {
    const { reference } = req.body;

    // Verify with Paystack
    const paystackResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const { status, metadata } = paystackResponse.data.data;

    if (status === 'success') {
      // Update payment status
      await VIPPayment.findOneAndUpdate(
        { paystackReference: reference },
        {
          status: 'completed',
          paymentDate: new Date()
        }
      );

      // TODO: Send notification to admin
      // For now, we'll mark as completed and admin can confirm later
    }

    res.json({ success: true, status });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed'
    });
  }
});

// Get VIP status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('vipTier vipExpiry isPublicProfile');
    res.json({
      vipTier: user.vipTier,
      vipExpiry: user.vipExpiry,
      isPublicProfile: user.isPublicProfile,
      isVIP: user.vipTier !== 'none',
      isVVIP: user.vipTier === 'vvip'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get VIP status' });
  }
});

// Admin: Confirm VIP payment
router.put('/confirm-payment/:paymentId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const payment = await VIPPayment.findById(req.params.paymentId).populate('user');

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Update user VIP status based on tier and plan
    const vipExpiry = new Date();
    if (payment.paystackReference.includes('yearly') ||
        payment.amount === 100000 || payment.amount === 500000) {
      vipExpiry.setFullYear(vipExpiry.getFullYear() + 1); // 1 year
    } else {
      vipExpiry.setMonth(vipExpiry.getMonth() + 1); // 1 month
    }

    const updateData = {
      vipTier: payment.tier,
      vipExpiry
    };

    // If VVIP, enable public profile
    if (payment.tier === 'vvip') {
      updateData.isPublicProfile = true;
    }

    await User.findByIdAndUpdate(payment.user._id, updateData);

    // Update payment record
    payment.confirmedBy = req.user.id;
    payment.confirmedAt = new Date();
    await payment.save();

    res.json({ success: true, message: `${payment.tier.toUpperCase()} status confirmed` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to confirm VIP payment' });
  }
});

// Admin: Get pending VIP payments
router.get('/pending-payments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const payments = await VIPPayment.find({ status: 'completed', confirmedBy: null })
      .populate('user', 'username email')
      .sort({ paymentDate: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get pending payments' });
  }
});

// Admin: Toggle user VIP status
router.put('/toggle-vip/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isVIP = !user.isVIP;

    if (user.isVIP) {
      user.vipExpiry = new Date();
      user.vipExpiry.setFullYear(user.vipExpiry.getFullYear() + 1);
    } else {
      user.vipExpiry = null;
    }

    await user.save();

    res.json({
      success: true,
      isVIP: user.isVIP,
      vipExpiry: user.vipExpiry
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle VIP status' });
  }
});

// Bet Converter - VIP Only
router.post('/convert-booking-code', authenticateToken, async (req, res) => {
  try {
    // Check if user is VIP or VVIP
    const user = await User.findById(req.user.id).select('vipTier vipExpiry');
    if (!user.vipTier || user.vipTier === 'none' || (user.vipExpiry && user.vipExpiry < new Date())) {
      return res.status(403).json({
        success: false,
        error: 'VIP access required for bet converter'
      });
    }

    const { fromBookmaker, toBookmaker, bookingCode } = req.body;

    if (!fromBookmaker || !toBookmaker || !bookingCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fromBookmaker, toBookmaker, bookingCode'
      });
    }

    // Simple bet code conversion logic
    // This is a basic implementation - in production you'd want more comprehensive mapping
    const convertedCode = await convertBettingCode(fromBookmaker, toBookmaker, bookingCode);

    if (!convertedCode) {
      return res.status(400).json({
        success: false,
        error: 'Unable to convert booking code. Please check the code format.'
      });
    }

    res.json({
      success: true,
      data: {
        originalCode: bookingCode,
        fromBookmaker,
        toBookmaker,
        convertedCode,
        convertedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Bet converter error:', error);
    res.status(500).json({
      success: false,
      error: 'Bet conversion failed'
    });
  }
});

// Get available bookmakers for conversion
router.get('/bookmakers', authenticateToken, async (req, res) => {
  try {
    // Check if user is VIP or VVIP
    const user = await User.findById(req.user.id).select('vipTier vipExpiry');
    if (!user.vipTier || user.vipTier === 'none' || (user.vipExpiry && user.vipExpiry < new Date())) {
      return res.status(403).json({
        success: false,
        error: 'VIP access required'
      });
    }

    const bookmakers = [
      { id: 'bet9ja', name: 'Bet9ja', country: 'Nigeria' },
      { id: 'sportybet', name: 'SportyBet', country: 'Nigeria' },
      { id: 'betking', name: 'BetKing', country: 'Nigeria' },
      { id: 'nairabet', name: 'NairaBet', country: 'Nigeria' },
      { id: 'merrybet', name: 'MerryBet', country: 'Nigeria' },
      { id: 'bet365', name: 'Bet365', country: 'International' },
      { id: '1xbet', name: '1xBet', country: 'International' },
      { id: 'betway', name: 'Betway', country: 'International' },
      { id: 'pinnacle', name: 'Pinnacle', country: 'International' }
    ];

    res.json({
      success: true,
      data: bookmakers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get bookmakers'
    });
  }
});

module.exports = router;

// Helper function for bet code conversion
async function convertBettingCode(fromBookmaker, toBookmaker, code) {
  // This is a simplified conversion logic
  // In a real implementation, you'd have comprehensive mapping tables
  // or integrate with third-party conversion services

  const conversionMap = {
    'bet9ja': {
      'sportybet': (code) => {
        // Example conversion logic - replace specific patterns
        return code.replace(/B9J/g, 'SB').replace(/^9/, 'S');
      },
      'betking': (code) => {
        return code.replace(/B9J/g, 'BK').replace(/^9/, 'K');
      },
      'bet365': (code) => {
        // Convert to Bet365 format (typically longer alphanumeric)
        return 'B365' + code.substring(1);
      }
    },
    'sportybet': {
      'bet9ja': (code) => {
        return code.replace(/SB/g, 'B9J').replace(/^S/, '9');
      },
      'betking': (code) => {
        return code.replace(/SB/g, 'BK').replace(/^S/, 'K');
      },
      'bet365': (code) => {
        return 'B365' + code.substring(1);
      }
    },
    'betking': {
      'bet9ja': (code) => {
        return code.replace(/BK/g, 'B9J').replace(/^K/, '9');
      },
      'sportybet': (code) => {
        return code.replace(/BK/g, 'SB').replace(/^K/, 'S');
      },
      'bet365': (code) => {
        return 'B365' + code.substring(1);
      }
    },
    'bet365': {
      'bet9ja': (code) => {
        if (code.startsWith('B365')) {
          return '9' + code.substring(4);
        }
        return code;
      },
      'sportybet': (code) => {
        if (code.startsWith('B365')) {
          return 'S' + code.substring(4);
        }
        return code;
      },
      'betking': (code) => {
        if (code.startsWith('B365')) {
          return 'K' + code.substring(4);
        }
        return code;
      }
    }
  };

  // Normalize bookmaker names
  const from = fromBookmaker.toLowerCase();
  const to = toBookmaker.toLowerCase();

  if (conversionMap[from] && conversionMap[from][to]) {
    return conversionMap[from][to](code);
  }

  // If no specific conversion exists, return original code with a note
  return code + '_CONVERTED';
}
