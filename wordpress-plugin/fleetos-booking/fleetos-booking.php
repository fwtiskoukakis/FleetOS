<?php
/**
 * Plugin Name: FleetOS Booking Integration
 * Plugin URI: https://fleetos.eu
 * Description: Integrate FleetOS car rental booking system with your WordPress site. Display availability search form and redirect to FleetOS booking platform.
 * Version: 1.0.0
 * Author: FleetOS
 * Author URI: https://fleetos.eu
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: fleetos-booking
 * Domain Path: /languages
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('FLEETOS_BOOKING_VERSION', '1.0.0');
define('FLEETOS_BOOKING_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('FLEETOS_BOOKING_PLUGIN_URL', plugin_dir_url(__FILE__));
define('FLEETOS_BOOKING_PLUGIN_BASENAME', plugin_basename(__FILE__));

/**
 * Main FleetOS Booking Plugin Class
 */
class FleetOS_Booking {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->init_hooks();
    }
    
    private function init_hooks() {
        // Activation/Deactivation hooks
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
        
        // Admin hooks
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        
        // Frontend hooks
        add_action('wp_enqueue_scripts', array($this, 'enqueue_frontend_scripts'));
        add_action('wp_footer', array($this, 'add_inline_scripts'));
        
        // Widget registration
        add_action('widgets_init', array($this, 'register_widgets'));
        
        // Shortcode
        add_shortcode('fleetos_booking_form', array($this, 'booking_form_shortcode'));
        add_shortcode('fleetos_availability_search', array($this, 'availability_search_shortcode'));
        
        // AJAX handlers
        add_action('wp_ajax_fleetos_validate_organization', array($this, 'ajax_validate_organization'));
        add_action('wp_ajax_nopriv_fleetos_validate_organization', array($this, 'ajax_validate_organization'));
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        // Set default options
        $default_options = array(
            'fleetos_api_url' => 'https://fleetos.eu/api/v1',
            'organization_slug' => '',
            'redirect_url' => 'https://fleetos.eu/booking',
            'form_style' => 'default',
            'show_pickup_location' => true,
            'show_dropoff_location' => true,
            'default_pickup_time' => '10:00',
            'default_dropoff_time' => '10:00',
        );
        
        add_option('fleetos_booking_options', $default_options);
        
        // Flush rewrite rules if needed
        flush_rewrite_rules();
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Clean up if needed
        flush_rewrite_rules();
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            __('FleetOS Booking Settings', 'fleetos-booking'),
            __('FleetOS Booking', 'fleetos-booking'),
            'manage_options',
            'fleetos-booking',
            array($this, 'render_settings_page')
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('fleetos_booking_options', 'fleetos_booking_options', array($this, 'sanitize_settings'));
    }
    
    /**
     * Sanitize settings
     */
    public function sanitize_settings($input) {
        $sanitized = array();
        
        if (isset($input['organization_slug'])) {
            $sanitized['organization_slug'] = sanitize_text_field($input['organization_slug']);
        }
        
        if (isset($input['fleetos_api_url'])) {
            $sanitized['fleetos_api_url'] = esc_url_raw($input['fleetos_api_url']);
        }
        
        if (isset($input['redirect_url'])) {
            $sanitized['redirect_url'] = esc_url_raw($input['redirect_url']);
        }
        
        if (isset($input['form_style'])) {
            $sanitized['form_style'] = sanitize_text_field($input['form_style']);
        }
        
        $sanitized['show_pickup_location'] = isset($input['show_pickup_location']) ? 1 : 0;
        $sanitized['show_dropoff_location'] = isset($input['show_dropoff_location']) ? 1 : 0;
        $sanitized['default_pickup_time'] = sanitize_text_field($input['default_pickup_time'] ?? '10:00');
        $sanitized['default_dropoff_time'] = sanitize_text_field($input['default_dropoff_time'] ?? '10:00');
        
        return $sanitized;
    }
    
    /**
     * Enqueue admin scripts
     */
    public function enqueue_admin_scripts($hook) {
        if ('settings_page_fleetos-booking' !== $hook) {
            return;
        }
        
        wp_enqueue_style('fleetos-booking-admin', FLEETOS_BOOKING_PLUGIN_URL . 'assets/admin.css', array(), FLEETOS_BOOKING_VERSION);
        wp_enqueue_script('fleetos-booking-admin', FLEETOS_BOOKING_PLUGIN_URL . 'assets/admin.js', array('jquery'), FLEETOS_BOOKING_VERSION, true);
    }
    
    /**
     * Enqueue frontend scripts
     */
    public function enqueue_frontend_scripts() {
        wp_enqueue_style('fleetos-booking-frontend', FLEETOS_BOOKING_PLUGIN_URL . 'assets/frontend.css', array(), FLEETOS_BOOKING_VERSION);
        wp_enqueue_script('fleetos-booking-frontend', FLEETOS_BOOKING_PLUGIN_URL . 'assets/frontend.js', array('jquery'), FLEETOS_BOOKING_VERSION, true);
        
        $options = get_option('fleetos_booking_options');
        wp_localize_script('fleetos-booking-frontend', 'fleetosBooking', array(
            'apiUrl' => $options['fleetos_api_url'] ?? 'https://fleetos.eu/api/v1',
            'organizationSlug' => $options['organization_slug'] ?? '',
            'redirectUrl' => $options['redirect_url'] ?? 'https://fleetos.eu/booking',
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('fleetos_booking_nonce'),
        ));
    }
    
    /**
     * Add inline scripts
     */
    public function add_inline_scripts() {
        $options = get_option('fleetos_booking_options');
        ?>
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            // Handle form submission
            $('.fleetos-booking-form').on('submit', function(e) {
                e.preventDefault();
                
                const form = $(this);
                const formData = {
                    pickup_date: form.find('[name="pickup_date"]').val(),
                    pickup_time: form.find('[name="pickup_time"]').val(),
                    pickup_location_id: form.find('[name="pickup_location_id"]').val(),
                    dropoff_date: form.find('[name="dropoff_date"]').val(),
                    dropoff_time: form.find('[name="dropoff_time"]').val(),
                    dropoff_location_id: form.find('[name="dropoff_location_id"]').val(),
                };
                
                // Validate form
                if (!formData.pickup_date || !formData.dropoff_date || !formData.pickup_location_id || !formData.dropoff_location_id) {
                    alert('<?php _e('Please fill in all required fields.', 'fleetos-booking'); ?>');
                    return;
                }
                
                // Validate dates
                if (new Date(formData.pickup_date) >= new Date(formData.dropoff_date)) {
                    alert('<?php _e('Dropoff date must be after pickup date.', 'fleetos-booking'); ?>');
                    return;
                }
                
                // Build redirect URL
                const orgSlug = '<?php echo esc_js($options['organization_slug'] ?? ''); ?>';
                const baseUrl = '<?php echo esc_js($options['redirect_url'] ?? 'https://fleetos.eu/booking'); ?>';
                const params = new URLSearchParams(formData);
                
                window.location.href = baseUrl + '/' + orgSlug + '/search?' + params.toString();
            });
        });
        </script>
        <?php
    }
    
    /**
     * Register widgets
     */
    public function register_widgets() {
        require_once FLEETOS_BOOKING_PLUGIN_DIR . 'includes/class-fleetos-booking-widget.php';
        register_widget('FleetOS_Booking_Widget');
    }
    
    /**
     * Booking form shortcode
     */
    public function booking_form_shortcode($atts) {
        $atts = shortcode_atts(array(
            'style' => 'default',
            'show_pickup_location' => 'yes',
            'show_dropoff_location' => 'yes',
        ), $atts);
        
        $options = get_option('fleetos_booking_options');
        $org_slug = $options['organization_slug'] ?? '';
        
        if (empty($org_slug)) {
            return '<p>' . __('Please configure FleetOS Booking plugin settings.', 'fleetos-booking') . '</p>';
        }
        
        ob_start();
        include FLEETOS_BOOKING_PLUGIN_DIR . 'templates/booking-form.php';
        return ob_get_clean();
    }
    
    /**
     * Availability search shortcode
     */
    public function availability_search_shortcode($atts) {
        return $this->booking_form_shortcode($atts);
    }
    
    /**
     * AJAX: Validate organization
     */
    public function ajax_validate_organization() {
        check_ajax_referer('fleetos_booking_nonce', 'nonce');
        
        $slug = sanitize_text_field($_POST['slug'] ?? '');
        
        if (empty($slug)) {
            wp_send_json_error(array('message' => __('Organization slug is required.', 'fleetos-booking')));
        }
        
        $options = get_option('fleetos_booking_options');
        $api_url = $options['fleetos_api_url'] ?? 'https://fleetos.eu/api/v1';
        
        // Validate organization via API
        $response = wp_remote_get($api_url . '/organizations/' . $slug . '/validate', array(
            'timeout' => 10,
        ));
        
        if (is_wp_error($response)) {
            wp_send_json_error(array('message' => $response->get_error_message()));
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (isset($data['is_valid']) && $data['is_valid']) {
            wp_send_json_success($data);
        } else {
            wp_send_json_error(array('message' => $data['error_message'] ?? __('Organization not found or inactive.', 'fleetos-booking')));
        }
    }
    
    /**
     * Render settings page
     */
    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        $options = get_option('fleetos_booking_options');
        
        include FLEETOS_BOOKING_PLUGIN_DIR . 'templates/admin-settings.php';
    }
}

// Initialize plugin
function fleetos_booking_init() {
    return FleetOS_Booking::get_instance();
}

// Start the plugin
add_action('plugins_loaded', 'fleetos_booking_init');

