<?php
/**
 * BalePay_Report — گزارش خودکار روزانه/هفتگی فروش برای مدیر
 *
 * @package BalePay
 */

if (!defined('ABSPATH')) {
	exit;
}

class BalePay_Report {

	/**
	 * اجرای روزانه از کرون — در صورت مطابقت تنظیمات، گزارش ارسال می‌شود
	 */
	public static function maybe_send() {
		$type = BalePay_Bot::opt('report_type', 'off');
		if ('off' === $type) {
			return;
		}

		/* بررسی ساعت */
		$hour = (int) BalePay_Bot::opt('report_hour', 9);
		$now  = (int) current_time('H');
		if ($hour !== $now) {
			return;
		}

		/* در حالت هفتگی، روز هم باید مطابق باشد */
		if ('weekly' === $type && current_time('l') !== BalePay_Bot::opt('report_day', 'Saturday')) {
			return;
		}

		self::send($type);
	}

	/**
	 * ساخت و ارسال گزارش
	 *
	 * @param string $type daily|weekly
	 */
	public static function send($type) {
		$days  = ('weekly' === $type) ? 7 : 1;
		$since = gmdate('Y-m-d H:i:s', strtotime("-{$days} days", current_time('timestamp')));

		$orders = wc_get_orders([
			'status'  => ['wc-processing', 'wc-completed', 'wc-on-hold', 'wc-pending', 'wc-failed'],
			'date_created' => '>' . $since,
			'limit'   => -1,
			'return'  => 'objects',
		]);

		$total   = 0;
		$counts  = ['processing' => 0, 'completed' => 0, 'on-hold' => 0, 'pending' => 0, 'failed' => 0];
		foreach ($orders as $order) {
			$status = $order->get_status();
			if (isset($counts[$status])) {
				$counts[$status]++;
			}
			if (in_array($status, ['processing', 'completed'], true)) {
				$total += (float) $order->get_total();
			}
		}

		$label = ('weekly' === $type) ? 'هفتگی' : 'روزانه';
		$text  = "📊 گزارش {$label} فروش\n" . get_bloginfo('name') . "\n"
			. "─────────────────────\n"
			. "📦 سفارشات:\n"
			. '├ کل: ' . count($orders) . "\n"
			. '├ تکمیل شده: ' . $counts['completed'] . "\n"
			. '├ در حال پردازش: ' . $counts['processing'] . "\n"
			. '├ در انتظار: ' . ($counts['on-hold'] + $counts['pending']) . "\n"
			. '└ ناموفق: ' . $counts['failed'] . "\n\n"
			. '💰 فروش کل: ' . number_format_i18n($total) . ' تومان';

		foreach (BalePay_Bot::admin_ids() as $platform => $chat_id) {
			BalePay_Bot::send($platform, $chat_id, $text);
		}
		BalePay_Bot::log("{$label} report sent to admin");
	}
}
