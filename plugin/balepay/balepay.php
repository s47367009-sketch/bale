<?php
/**
 * Plugin Name:       بله‌پی | BalePay
 * Plugin URI:        https://pandawp.ir
 * Description:       مدیریت خودکار سفارشات ووکامرس از طریق ربات بله و تلگرام — درگاه پرداخت کارت به کارت با تأیید مدیر، اعلان خودکار، Undo و گزارش فروش.
 * Version:           1.0.0
 * Author:            پاندا وردپرس (PandaWP)
 * Author URI:        https://pandawp.ir
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       balepay
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * WC requires at least: 8.0
 * WC tested up to:   9.9
 */

if (!defined('ABSPATH')) {
	exit; // دسترسی مستقیم ممنوع
}

define('BALEPAY_VERSION', '1.0.0');
define('BALEPAY_FILE', __FILE__);
define('BALEPAY_DIR', plugin_dir_path(__FILE__));
define('BALEPAY_URL', plugin_dir_url(__FILE__));

/* ═══════════════ فعال‌سازی / غیرفعال‌سازی ═══════════════ */

register_activation_hook(__FILE__, 'balepay_activate');
/**
 * ساخت Secret برای وب‌هوک + زمان‌بندی گزارش خودکار
 */
function balepay_activate() {
	if (false === get_option('balepay_webhook_secret')) {
		update_option('balepay_webhook_secret', wp_generate_password(24, false, false));
	}
	if (!wp_next_scheduled('balepay_daily_report')) {
		wp_schedule_event(strtotime('tomorrow +1 hour'), 'daily', 'balepay_daily_report');
	}
}

register_deactivation_hook(__FILE__, function () {
	wp_clear_scheduled_hook('balepay_daily_report');
});

/* ═══════════════ بررسی ووکامرس ═══════════════ */

add_action('admin_notices', function () {
	if (class_exists('WooCommerce') || !current_user_can('activate_plugins')) {
		return;
	}
	echo '<div class="notice notice-error"><p><strong>بله‌پی:</strong> این افزونه برای کار کردن به <strong>ووکامرس</strong> نیاز دارد. لطفاً ابتدا ووکامرس را نصب و فعال کنید.</p></div>';
});

/* سازگاری با HPOS (جداول سفارش جدید ووکامرس) */
add_action('before_woocommerce_init', function () {
	if (class_exists(\Automattic\WooCommerce\Utilities\FeaturesUtil::class)) {
		\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
	}
});

/* ═══════════════ بارگذاری فایل‌ها ═══════════════ */

require_once BALEPAY_DIR . 'includes/class-balepay-bot.php';
require_once BALEPAY_DIR . 'includes/class-balepay-gateway.php';
require_once BALEPAY_DIR . 'includes/class-balepay-webhook.php';
require_once BALEPAY_DIR . 'includes/class-balepay-report.php';

/* ═══════════════ هوک‌های اصلی ═══════════════ */

/* ثبت درگاه پرداخت در ووکامرس */
add_filter('woocommerce_payment_gateways', function ($gateways) {
	$gateways[] = 'BalePay_Gateway';
	return $gateways;
});

/* ثبت مسیر REST برای وب‌هوک ربات */
add_action('rest_api_init', ['BalePay_Webhook', 'register_routes']);

/* گزارش خودکار روزانه/هفتگی */
add_action('balepay_daily_report', ['BalePay_Report', 'maybe_send']);

/* ═══════════════ منوی مدیریت (پنل بله‌پی) ═══════════════ */

add_action('admin_menu', function () {
	add_menu_page(
		'بله‌پی',
		'بله‌پی',
		'manage_woocommerce',
		'balepay',
		function () {
			$url = BALEPAY_URL . 'admin-panel/panel.php';
			echo '<iframe src="' . esc_url($url) . '" title="پنل بله‌پی" style="width:100%;height:calc(100vh - 40px);border:0;margin:0 -20px -20px;"></iframe>';
		},
		'dashicons-money-alt',
		58
	);
});

/* لینک «تنظیمات» در لیست افزونه‌ها */
add_filter('plugin_action_links_' . plugin_basename(__FILE__), function ($links) {
	array_unshift(
		$links,
		'<a href="' . esc_url(admin_url('admin.php?page=balepay')) . '">پنل بله‌پی</a>',
		'<a href="' . esc_url(admin_url('admin.php?page=wc-settings&tab=checkout&section=balepay')) . '">تنظیمات درگاه</a>'
	);
	return $links;
});
