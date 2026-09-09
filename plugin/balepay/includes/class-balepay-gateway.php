<?php
/**
 * BalePay_Gateway — درگاه پرداخت کارت به کارت برای ووکامرس
 *
 * @package BalePay
 */

if (!defined('ABSPATH')) {
	exit;
}

class BalePay_Gateway extends WC_Payment_Gateway {

	/** شناسه درگاه */
	public $id = 'balepay';

	public function __construct() {
		$this->method_title       = 'بله‌پی (کارت به کارت)';
		$this->method_description = 'دریافت پرداخت کارت به کارت با تأیید مدیر از طریق ربات بله/تلگرام — همراه اعلان خودکار، Undo و گزارش فروش.';
		$this->has_fields         = false;
		$this->supports           = ['products'];

		$this->init_form_fields();
		$this->init_settings();

		$this->title       = $this->get_option('title');
		$this->description = $this->get_option('description');

		/* ذخیره تنظیمات */
		add_action('woocommerce_update_options_payment_gateways_' . $this->id, [$this, 'process_admin_options']);

		/* نمایش کارت‌ها و راهنما در صفحه تشکر */
		add_action('woocommerce_thankyou_' . $this->id, [$this, 'thankyou_page']);
	}

	/* ═══════════════ فیلدهای تنظیمات ═══════════════ */

	public function init_form_fields() {
		$banks = ['بانک ملی', 'بانک ملت', 'بانک صادرات', 'بانک تجارت', 'بانک سپه', 'بانک پاسارگاد', 'بانک سامان', 'بانک آینده', 'بانک مهر اقتصاد', 'بانکشهر'];

		$this->form_fields = [

			/* ── عمومی ── */
			'enabled'      => [
				'title'   => 'فعال/غیرفعال',
				'type'    => 'checkbox',
				'label'   => 'فعال‌سازی درگاه بله‌پی',
				'default' => 'yes',
			],
			'title'        => [
				'title'       => 'عنوان درگاه',
				'type'        => 'text',
				'description' => 'عنوانی که مشتری در صفحه پرداخت می‌بیند.',
				'default'     => 'کارت به کارت (تأیید سریع)',
				'desc_tip'    => true,
			],
			'description'  => [
				'title'       => 'توضیحات درگاه',
				'type'        => 'textarea',
				'default'     => 'پس از ثبت سفارش، کارت‌های بانکی نمایش داده می‌شود؛ پرداخت کنید و رسید را در ربات ارسال نمایید تا مدیر تأیید کند.',
			],

			/* ── کارت‌ها ── */
			'cards_title'  => [
				'title' => '💳 کارت‌های بانکی',
				'type'  => 'title',
			],
		];

		/* کارت ۱ تا ۳ */
		for ($i = 1; $i <= 3; $i++) {
			$this->form_fields["card{$i}_number"] = [
				'title'       => "شماره کارت {$i}",
				'type'        => 'text',
				'description' => 'خالی بگذارید تا نادیده گرفته شود.',
				'placeholder' => '6037-9912-3456-7890',
			];
			$this->form_fields["card{$i}_bank"]   = [
				'title'   => "نام بانک (کارت {$i})",
				'type'    => 'select',
				'options' => array_combine($banks, $banks),
				'default' => 'بانک ملی',
			];
			$this->form_fields["card{$i}_holder"] = [
				'title' => "نام صاحب حساب (کارت {$i})",
				'type'  => 'text',
			];
		}

		$this->form_fields += [

			'sheba'        => [
				'title'   => 'شماره شبا',
				'type'    => 'text',
				'default' => '',
			],
			'deadline'     => [
				'title'       => 'مهلت پرداخت (ساعت)',
				'type'        => 'number',
				'default'     => '24',
				'description' => 'مهلت ارسال رسید برای مشتری.',
				'desc_tip'    => true,
			],
			'status_after' => [
				'title'   => 'وضعیت سفارش پس از تأیید مدیر',
				'type'    => 'select',
				'options' => [
					'processing' => 'در حال پردازش (processing)',
					'completed'  => 'تکمیل شده (completed)',
				],
				'default' => 'processing',
			],
			'guide'        => [
				'title'   => 'متن راهنمای پرداخت',
				'type'    => 'textarea',
				'default' => 'لطفاً مبلغ سفارش را به یکی از کارت‌های فوق کارت به کارت کنید و تصویر رسید را در چت ربات ارسال نمایید. پس از بررسی مدیر، نتیجه تأیید برای شما ارسال می‌شود.',
			],

			/* ── ربات‌ها ── */
			'bots_title'   => [
				'title' => '🤖 اتصال ربات‌ها',
				'type'  => 'title',
			],
			'bale_token'   => [
				'title'       => 'توکن ربات بله',
				'type'        => 'text',
				'description' => 'از @BotFather بله دریافت کنید.',
				'desc_tip'    => true,
			],
			'bale_admin_id' => [
				'title'       => 'آیدی مدیر بله (chat_id)',
				'type'        => 'text',
				'description' => 'برای یافتن chat_id، به ربات پیام /start بدهید و از لاگ افزونه ببینید.',
				'desc_tip'    => true,
			],
			'telegram_token' => [
				'title' => 'توکن ربات تلگرام',
				'type'  => 'text',
			],
			'telegram_admin_id' => [
				'title' => 'آیدی مدیر تلگرام (chat_id)',
				'type'  => 'text',
			],
			'welcome_text' => [
				'title'   => 'پیام خوش‌آمد /start',
				'type'    => 'textarea',
				'default' => "سلام 👋\nبه ربات فروشگاه ما خوش آمدید.\nبرای اتصال سفارش‌تان، شماره سفارش را ارسال کنید (مثلاً #1234).",
			],

			/* ── اعلان‌ها ── */
			'notify_title' => [
				'title' => '🔔 اعلان‌ها',
				'type'  => 'title',
			],
			'notify_customer' => [
				'title'   => 'اعلان به مشتری',
				'type'    => 'checkbox',
				'label'   => 'ارسال وضعیت سفارش به مشتری در ربات',
				'default' => 'yes',
			],
			'notify_admin'  => [
				'title'   => 'اعلان به مدیر',
				'type'    => 'checkbox',
				'label'   => 'ارسال سفارش جدید و رسید به مدیر (با دکمه تأیید/رد)',
				'default' => 'yes',
			],

			/* ── قالب پیام‌ها ── */
			'tpl_title'    => [
				'title' => '📝 قالب پیام‌ها',
				'type'  => 'title',
				'description' => 'متغیرها: {order_id} {total} {customer} {date} {items} {cards} {order_url}',
			],
			'tpl_customer_order' => [
				'title'   => 'پیام ثبت سفارش (مشتری)',
				'type'    => 'textarea',
				'default' => "🛒 سفارش {order_id} ثبت شد\n💰 مبلغ: {total}\n\n💳 کارت‌های پرداخت:\n{cards}\n\n✅ پس از پرداخت، تصویر رسید را در همین چت ارسال کنید.\n🔗 {order_url}",
			],
			'tpl_customer_approve' => [
				'title'   => 'پیام تأیید پرداخت (مشتری)',
				'type'    => 'textarea',
				'default' => "✅ پرداخت سفارش {order_id} تأیید شد!\nسفارش شما در حال پردازش است 🎉",
			],
			'tpl_customer_reject' => [
				'title'   => 'پیام رد پرداخت (مشتری)',
				'type'    => 'textarea',
				'default' => "❌ پرداخت سفارش {order_id} تأیید نشد.\nلطفاً رسید صحیح را مجدداً ارسال کنید یا با پشتیبانی تماس بگیرید.",
			],
			'tpl_admin_new' => [
				'title'   => 'پیام سفارش جدید (مدیر)',
				'type'    => 'textarea',
				'default' => "{order_id}\n👤 {customer}\n💰 {total}\n📅 {date}\n📦 {items}\n\n⏳ در انتظار تأیید پرداخت کارت به کارت",
			],

			/* ── گزارش ── */
			'report_title' => [
				'title' => '📊 گزارش خودکار',
				'type'  => 'title',
			],
			'report_type'  => [
				'title'   => 'نوع گزارش',
				'type'    => 'select',
				'options' => ['off' => 'غیرفعال', 'daily' => 'روزانه', 'weekly' => 'هفتگی'],
				'default' => 'off',
			],
			'report_hour'  => [
				'title'   => 'ساعت ارسال',
				'type'    => 'number',
				'default' => '9',
			],
			'report_day'   => [
				'title'   => 'روز ارسال (هفتگی)',
				'type'    => 'select',
				'options' => [
					'Saturday'  => 'شنبه',
					'Sunday'    => 'یکشنبه',
					'Monday'    => 'دوشنبه',
					'Tuesday'   => 'سه‌شنبه',
					'Wednesday' => 'چهارشنبه',
					'Thursday'  => 'پنجشنبه',
					'Friday'    => 'جمعه',
				],
				'default' => 'Saturday',
			],
		];
	}

	/* ═══════════════ پرداخت ═══════════════ */

	/**
	 * پردازش پرداخت: ثبت سفارش + اطلاع‌رسانی به مدیر و مشتری
	 *
	 * @param int $order_id شناسه سفارش
	 * @return array
	 */
	public function process_payment($order_id) {
		$order = wc_get_order($order_id);

		/* اعلان به مدیر (با دکمه‌های تأیید/رد) */
		if ('yes' === $this->get_option('notify_admin', 'yes')) {
			BalePay_Bot::notify_admin_new_order($order);
		}

		/* اعلان به مشتری (اگر چتش از قبل به سفارش متصل باشد) */
		BalePay_Bot::notify_customer($order, 'order');

		BalePay_Bot::log("Order #{$order_id} placed — total: " . $order->get_total());

		return [
			'result'   => 'success',
			'redirect' => $this->get_return_url($order),
		];
	}

	/* ═══════════════ صفحه تشکر ═══════════════ */

	/**
	 * نمایش کارت‌ها، شبا و راهنمای پرداخت در صفحه تشکر
	 *
	 * @param int $order_id شناسه سفارش
	 */
	public function thankyou_page($order_id) {
		$order = wc_get_order($order_id);
		if (!$order) {
			return;
		}

		$cards = BalePay_Bot::active_cards();
		$sheba = $this->get_option('sheba');

		echo '<section class="balepay-cards" style="background:#f6faf7;border:1px solid #dfebe2;border-radius:12px;padding:20px;margin:20px 0;direction:rtl;">';
		echo '<h3 style="margin:0 0 12px;">💳 کارت به کارت</h3>';

		if ($cards) {
			echo '<table style="width:100%;border-collapse:collapse;">';
			foreach ($cards as $card) {
				echo '<tr>';
				echo '<td style="padding:8px 0;font-weight:700;">' . esc_html($card['bank']) . '</td>';
				echo '<td style="padding:8px 0;direction:ltr;text-align:left;font-family:monospace;">' . esc_html($card['number']) . '</td>';
				echo '<td style="padding:8px 0;">' . esc_html($card['holder']) . '</td>';
				echo '</tr>';
			}
			echo '</table>';
		}

		if ($sheba) {
			echo '<p style="margin:12px 0 4px;"><strong>شماره شبا:</strong> <span style="direction:ltr;unicode-bidi:embed;font-family:monospace;">' . esc_html($sheba) . '</span></p>';
		}

		echo '<p style="margin:8px 0 0;color:#52685c;">' . wp_kses_post(wpautop($this->get_option('guide'))) . '</p>';
		echo '<p style="margin:8px 0 0;color:#52685c;">⏳ مهلت ارسال رسید: <strong>' . esc_html($this->get_option('deadline', 24)) . ' ساعت</strong> — شماره سفارش شما: <strong>#' . esc_html($order->get_id()) . '</strong></p>';
		echo '</section>';
	}
}
