<?php
/**
 * BalePay_Bot — ارتباط با API بله و تلگرام، اعلان‌ها و پردازش آپدیت‌ها
 *
 * @package BalePay
 */

if (!defined('ABSPATH')) {
	exit;
}

class BalePay_Bot {

	/** آدرس API هر پلتفرم (فرمت sprintf: توکن، متد) */
	const API = [
		'bale'     => 'https://tapi.bale.ai/bot%s/%s',
		'telegram' => 'https://api.telegram.org/bot%s/%s',
	];

	/* ═══════════════ تنظیمات ═══════════════ */

	/** خواندن تنظیمات درگاه (woocommerce_balepay_settings) */
	public static function opt($key, $default = '') {
		static $cache = null;
		if (null === $cache) {
			$cache = (array) get_option('woocommerce_balepay_settings', []);
		}
		return isset($cache[$key]) && '' !== $cache[$key] ? $cache[$key] : $default;
	}

	public static function token($platform) {
		return self::opt('bale' === $platform ? 'bale_token' : 'telegram_token');
	}

	public static function admin_ids() {
		return array_filter([
			'bale'     => self::opt('bale_admin_id'),
			'telegram' => self::opt('telegram_admin_id'),
		]);
	}

	/* ═══════════════ API ═══════════════ */

	/**
	 * ارسال پیام متنی (با کلید Inline اختیاری)
	 *
	 * @param string $platform  bale|telegram
	 * @param string $chat_id   آیدی چت گیرنده
	 * @param string $text      متن پیام (HTML)
	 * @param array  $keyboard  آرایه‌ی سطوح دکمه‌ها [[['text'=>'✅','callback_data'=>...]]]
	 * @return bool
	 */
	public static function send($platform, $chat_id, $text, $keyboard = null) {
		$token = self::token($platform);
		if (!$token || !$chat_id) {
			return false;
		}

		$body = [
			'chat_id' => $chat_id,
			'text'    => $text,
			'parse_mode' => 'HTML',
		];
		if ($keyboard) {
			$body['reply_markup'] = wp_json_encode(['inline_keyboard' => $keyboard]);
		}

		$res = wp_remote_post(
			sprintf(self::API[$platform], $token, 'sendMessage'),
			[
				'timeout' => 15,
				'headers' => ['Content-Type' => 'application/json'],
				'body'    => wp_json_encode($body),
			]
		);

		$ok = !is_wp_error($res) && 200 === (int) wp_remote_retrieve_response_code($res);
		if (!$ok) {
			self::log(sprintf('API error (%s): %s', $platform, is_wp_error($res) ? $res->get_error_message() : 'HTTP ' . wp_remote_retrieve_response_code($res)));
		}
		return $ok;
	}

	/** پاسخ به callback_query (حذف حالت لودینگ دکمه) */
	public static function answer_callback($platform, $callback_id, $text = '') {
		$token = self::token($platform);
		if (!$token || !$callback_id) {
			return;
		}
		wp_remote_post(
			sprintf(self::API[$platform], $token, 'answerCallbackQuery'),
			[
				'timeout' => 10,
				'headers' => ['Content-Type' => 'application/json'],
				'body'    => wp_json_encode(['callback_query_id' => $callback_id, 'text' => $text]),
			]
		);
	}

	/* ═══════════════ قالب‌ها و متغیرها ═══════════════ */

	/** جایگزینی متغیرهای {order_id} و … در قالب پیام */
	public static function render($template, $order) {
		$cards = '';
		foreach (self::active_cards() as $i => $card) {
			$cards .= sprintf("💳 %s\n%s — %s\n", $card['bank'], $card['number'], $card['holder']);
		}
		$items = '';
		foreach ($order->get_items() as $item) {
			$items .= sprintf("• %s × %s\n", $item->get_name(), $item->get_quantity());
		}

		$replacements = [
			'{order_id}'  => '#' . $order->get_id(),
			'{total}'     => wp_strip_all_tags(html_entity_decode($order->get_formatted_order_total(), ENT_QUOTES, 'UTF-8')),
			'{customer}'  => $order->get_formatted_billing_full_name() ?: 'مشتری',
			'{date}'      => $order->get_date_created() ? $order->get_date_created()->date_i18n('Y/m/d H:i') : '',
			'{items}'     => trim($items),
			'{cards}'     => trim($cards),
			'{order_url}' => $order->get_view_order_url(),
		];

		return str_replace(array_keys($replacements), array_values($replacements), $template);
	}

	/** کارت‌های بانکی فعال (۱ تا ۵) */
	public static function active_cards() {
		$cards = [];
		for ($i = 1; $i <= 5; $i++) {
			$number = self::opt("card{$i}_number");
			if ($number) {
				$cards[] = [
					'number' => $number,
					'bank'   => self::opt("card{$i}_bank", 'بانک'),
					'holder' => self::opt("card{$i}_holder"),
				];
			}
		}
		return $cards;
	}

	/* ═══════════════ اعلان‌ها ═══════════════ */

	/** اعلان سفارش جدید به مدیر (با دکمه‌های تأیید/رد) */
	public static function notify_admin_new_order($order, $title = '🔔 سفارش جدید') {
		$text = $title . "\n" . self::render(self::opt('tpl_admin_new', "{order_id}\n👤 {customer}\n💰 {total}\n📅 {date}\n📦 {items}\n\n⏳ در انتظار تأیید پرداخت کارت به کارت"), $order);
		$keyboard = [
			[
				['text' => '✅ تأیید', 'callback_data' => 'bpv:' . $order->get_id() . ':approve'],
				['text' => '❌ رد',   'callback_data' => 'bpv:' . $order->get_id() . ':reject'],
			],
		];
		foreach (self::admin_ids() as $platform => $chat_id) {
			if (self::send($platform, $chat_id, $text, $keyboard)) {
				self::log("Admin notification sent ({$platform}) for order #" . $order->get_id());
			}
		}
	}

	/** اعلان به مشتری بر اساس رویداد (order|approve|reject|undo) */
	public static function notify_customer($order, $event) {
		if ('yes' !== self::opt('notify_customer', 'yes')) {
			return;
		}
		$templates = [
			'order'   => 'tpl_customer_order',
			'approve' => 'tpl_customer_approve',
			'reject'  => 'tpl_customer_reject',
			'undo'    => 'tpl_customer_reject',
		];
		$default = [
			'order'   => "🛒 سفارش {order_id} ثبت شد\n💰 مبلغ: {total}\n\n💳 کارت‌های پرداخت:\n{cards}\n\n✅ پس از پرداخت، تصویر رسید را در همین چت ربات ارسال کنید.\n🔗 {order_url}",
			'approve' => "✅ پرداخت سفارش {order_id} تأیید شد!\nسفارش شما در حال پردازش است 🎉",
			'reject'  => "❌ پرداخت سفارش {order_id} تأیید نشد.\nلطفاً رسید صحیح را مجدداً ارسال کنید یا با پشتیبانی تماس بگیرید.",
		];
		$text = self::render(self::opt($templates[$event], $default[$event] ?? $default['reject']), $order);

		$chat = $order->get_meta('_balepay_chat'); // "platform:chat_id"
		if ($chat && 2 === count($parts = explode(':', $chat))) {
			self::send($parts[0], $parts[1], $text);
			self::log("Customer notification sent ({$event}) chat_id={$parts[1]}");
		}
	}

	/* ═══════════════ تأیید / رد / Undo ═══════════════ */

	/** تأیید سفارش توسط مدیر */
	public static function approve_order($order_id, $platform) {
		$order = wc_get_order($order_id);
		if (!$order) {
			return 'سفارش یافت نشد.';
		}

		$order->update_meta_data('_balepay_prev_status', $order->get_status());
		$status = self::opt('status_after_approve', 'processing');
		$order->update_status($status, 'تأیید پرداخت توسط مدیر از ربات (' . $platform . ') — بله‌پی');
		$order->save();

		self::notify_customer($order, 'approve');
		self::log("Webhook: callback bpv:{$order_id}:approve — Order #{$order_id} → {$status}");

		return '✅ سفارش #' . $order_id . ' تأیید شد';
	}

	/** رد سفارش توسط مدیر */
	public static function reject_order($order_id, $platform) {
		$order = wc_get_order($order_id);
		if (!$order) {
			return 'سفارش یافت نشد.';
		}

		$order->update_meta_data('_balepay_prev_status', $order->get_status());
		$order->update_status('failed', 'رد پرداخت توسط مدیر از ربات (' . $platform . ') — بله‌پی');
		$order->save();

		self::notify_customer($order, 'reject');
		self::log("Webhook: callback bpv:{$order_id}:reject — Order #{$order_id} → failed");

		return '❌ سفارش #' . $order_id . ' رد شد';
	}

	/** بازگشت آخرین اقدام (Undo) */
	public static function undo_order($order_id, $platform) {
		$order = wc_get_order($order_id);
		if (!$order) {
			return 'سفارش یافت نشد.';
		}

		$prev = $order->get_meta('_balepay_prev_status');
		if (!$prev) {
			return 'امکان بازگشت نیست.';
		}

		$order->update_status($prev, 'بازگشت (Undo) توسط مدیر از ربات (' . $platform . ') — بله‌پی');
		$order->save();

		self::notify_customer($order, 'undo');
		self::log("Order #{$order_id} rolled back (undo) → {$prev}");

		return "↩️ وضعیت سفارش #{$order_id} به «{$prev}» بازگشت";
	}

	/* ═══════════════ پردازش آپدیت وب‌هوک ═══════════════ */

	/**
	 * پردازش آپدیت دریافتی از بله/تلگرام
	 *
	 * @param string $platform bale|telegram
	 * @param array  $update   آبجکت آپدیت
	 */
	public static function handle_update($platform, $update) {
		if (empty($update)) {
			return;
		}

		/* ۱) callback_query: دکمه‌های تأیید/رد/بازگشت مدیر */
		if (isset($update['callback_query'])) {
			$cq       = $update['callback_query'];
			$chat_id  = (string) ($cq['message']['chat']['id'] ?? '');
			$callback = $cq['data'] ?? '';
			$cb_id    = $cq['id'] ?? '';

			/* فقط مدیر اجازه اقدام دارد */
			$admin = self::admin_ids();
			if (!isset($admin[$platform]) || (string) $admin[$platform] !== $chat_id) {
				self::answer_callback($platform, $cb_id, '⛔️ فقط مدیر می‌تواند این کار را انجام دهد.');
				return;
			}

			if (!preg_match('#^bpv:(\d+):(approve|reject|undo)$#', $callback, $m)) {
				return;
			}

			list(, $order_id, $action) = $m;

			if ('approve' === $action) {
				$message = self::approve_order($order_id, $platform);
				/* دکمه Undo برای ۳۰ ثانیه */
				self::send($platform, $chat_id, $message, [
					[['text' => '↩️ بازگشت (۳۰ ثانیه)', 'callback_data' => 'bpv:' . $order_id . ':undo']],
				]);
			} elseif ('reject' === $action) {
				$message = self::reject_order($order_id, $platform);
				self::send($platform, $chat_id, $message, [
					[['text' => '↩️ بازگشت (۳۰ ثانیه)', 'callback_data' => 'bpv:' . $order_id . ':undo']],
				]);
			} else {
				$message = self::undo_order($order_id, $platform);
			}

			self::answer_callback($platform, $cb_id, $message);
			return;
		}

		/* ۲) پیام عادی مشتری */
		$message = $update['message'] ?? null;
		if (!$message || empty($message['chat']['id'])) {
			return;
		}

		$chat_id = (string) $message['chat']['id'];
		$text    = trim($message['text'] ?? '');

		/* /start → خوش‌آمد */
		if ('/start' === $text) {
			$welcome = self::opt('welcome_text', "سلام 👋\nبه ربات «" . get_bloginfo('name') . "» خوش آمدید.\n\nبرای اتصال سفارش‌تان، شماره سفارش را ارسال کنید (مثلاً #1234).");
			self::send($platform, $chat_id, $welcome);
			self::log("New /start ({$platform}) chat_id={$chat_id}");
			return;
		}

		/* شماره سفارش (#1234 یا 1234) → اتصال چت مشتری به سفارش */
		if (preg_match('#^#?(\d{3,})$#u', $text, $m)) {
			$order = wc_get_order((int) $m[1]);
			if ($order && in_array($order->get_status(), ['pending', 'on-hold', 'failed'], true)) {
				/* ذخیره دوطرفه: متای سفارش (برای اطلاع‌رسانی) + آپشن (برای یافتن سفارش از چت) */
				$order->update_meta_data('_balepay_chat', $platform . ':' . $chat_id);
				$order->save();
				update_option('balepay_chat_' . $platform . '_' . $chat_id, (int) $m[1], false);
				self::send($platform, $chat_id, "✅ سفارش #{$m[1]} به این چت متصل شد.\n💰 مبلغ: " . wp_strip_all_tags(html_entity_decode($order->get_formatted_order_total(), ENT_QUOTES, 'UTF-8')) . "\n\n💳 کارت‌های پرداخت:\n" . self::render('{cards}', $order) . "\n\nپس از پرداخت، تصویر رسید را در همین چت ارسال کنید 🧾");
				self::log("Order #{$m[1]} bound to chat_id={$chat_id} ({$platform})");
			} else {
				self::send($platform, $chat_id, '❌ سفارشی با این شماره پیدا نشد یا قبلاً پردازش شده است.');
			}
			return;
		}

		/* عکس → رسید پرداخت */
		if (!empty($message['photo'])) {
			$order_id = get_option('balepay_chat_' . $platform . '_' . $chat_id);
			$order    = $order_id ? wc_get_order((int) $order_id) : null;

			if ($order && in_array($order->get_status(), ['pending', 'on-hold'], true)) {
				$order->update_status('on-hold', 'رسید پرداخت توسط مشتری ارسال شد — در انتظار تأیید مدیر — بله‌پی');
				$order->save();

				self::send($platform, $chat_id, "🧾 رسید پرداخت دریافت شد!\nپس از بررسی مدیر، نتیجه برای شما ارسال می‌شود ⏳");
				self::notify_admin_new_order($order, '🧾 رسید جدید');
				self::log("Receipt uploaded for order #{$order_id} — pending → on-hold");
			} else {
				self::send($platform, $chat_id, '⚠️ ابتدا شماره سفارش خود را ارسال کنید (مثلاً #1234).');
			}
		}
	}

	/* ═══════════════ لاگ ═══════════════ */

	/** ثبت رویداد در لاگ داخلی (حداکثر ۱۰۰ خط) */
	public static function log($message) {
		$logs   = (array) get_option('balepay_logs', []);
		$logs[] = ['time' => current_time('H:i:s'), 'text' => $message];
		update_option('balepay_logs', array_slice($logs, -100), false);
	}
}
