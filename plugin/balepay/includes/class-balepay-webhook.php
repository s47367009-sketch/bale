<?php
/**
 * BalePay_Webhook — نقطه پایانی REST برای دریافت آپدیت‌های بله/تلگرام
 *
 * آدرس وب‌هوک:
 *   https://SITE/wp-json/balepay/v1/webhook?platform=bale&secret=SECRET
 *   https://SITE/wp-json/balepay/v1/webhook?platform=telegram&secret=SECRET
 *
 * @package BalePay
 */

if (!defined('ABSPATH')) {
	exit;
}

class BalePay_Webhook {

	/** ثبت مسیر REST */
	public static function register_routes() {
		register_rest_route('balepay/v1', '/webhook', [
			'methods'             => ['POST', 'GET'],
			'callback'            => [__CLASS__, 'handle'],
			'permission_callback' => '__return_true', // احراز هویت با Secret انجام می‌شود
		]);
	}

	/**
	 * پاسخ به درخواست وب‌هوک
	 *
	 * @param WP_REST_Request $request درخواست
	 * @return WP_REST_Response|WP_Error
	 */
	public static function handle($request) {
		$method = $request->get_method();

		/* GET → تست سلامت اتصال */
		if ('GET' === $method) {
			return rest_ensure_response([
				'ok'      => true,
				'service' => 'balepay',
				'version' => BALEPAY_VERSION,
			]);
		}

		/* بررسی Secret */
		$secret   = (string) get_option('balepay_webhook_secret');
		$provided = (string) ($request->get_header('X-Balepay-Secret') ?: $request->get_param('secret'));
		if ($secret && !hash_equals($secret, $provided)) {
			BalePay_Bot::log('Webhook rejected: invalid secret');
			return new WP_Error('balepay_forbidden', 'Forbidden', ['status' => 403]);
		}

		/* تشخیص پلتفرم */
		$platform = ('telegram' === $request->get_param('platform')) ? 'telegram' : 'bale';

		/* دریافت و پردازش آپدیت */
		$update = json_decode($request->get_body(), true);
		if ($update) {
			BalePay_Bot::log("Webhook received ({$platform})");
			BalePay_Bot::handle_update($platform, $update);
		}

		return rest_ensure_response(['ok' => true, 'result' => 'processed']);
	}
}
