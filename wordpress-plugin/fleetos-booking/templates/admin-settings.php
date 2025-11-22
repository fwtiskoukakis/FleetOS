<?php
/**
 * Admin Settings Template
 */

if (!defined('ABSPATH')) {
    exit;
}

// Handle form submission
if (isset($_POST['fleetos_booking_submit']) && check_admin_referer('fleetos_booking_settings')) {
    $options = array(
        'organization_slug' => sanitize_text_field($_POST['organization_slug'] ?? ''),
        'fleetos_api_url' => esc_url_raw($_POST['fleetos_api_url'] ?? 'https://fleetos.eu/api/v1'),
        'redirect_url' => esc_url_raw($_POST['redirect_url'] ?? 'https://fleetos.eu/booking'),
        'form_style' => sanitize_text_field($_POST['form_style'] ?? 'default'),
        'show_pickup_location' => isset($_POST['show_pickup_location']) ? 1 : 0,
        'show_dropoff_location' => isset($_POST['show_dropoff_location']) ? 1 : 0,
        'default_pickup_time' => sanitize_text_field($_POST['default_pickup_time'] ?? '10:00'),
        'default_dropoff_time' => sanitize_text_field($_POST['default_dropoff_time'] ?? '10:00'),
    );
    
    update_option('fleetos_booking_options', $options);
    echo '<div class="notice notice-success"><p>' . __('Settings saved successfully!', 'fleetos-booking') . '</p></div>';
    
    // Clear location cache
    delete_transient('fleetos_locations_' . $options['organization_slug']);
}

$options = get_option('fleetos_booking_options', array());
?>

<div class="wrap">
    <h1><?php _e('FleetOS Booking Settings', 'fleetos-booking'); ?></h1>
    
    <form method="post" action="">
        <?php wp_nonce_field('fleetos_booking_settings'); ?>
        
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="organization_slug"><?php _e('Organization Slug', 'fleetos-booking'); ?></label>
                </th>
                <td>
                    <input 
                        type="text" 
                        id="organization_slug" 
                        name="organization_slug" 
                        value="<?php echo esc_attr($options['organization_slug'] ?? ''); ?>" 
                        class="regular-text"
                        required
                    >
                    <p class="description">
                        <?php _e('Your organization slug from FleetOS (e.g., "my-rental-company")', 'fleetos-booking'); ?>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="fleetos_api_url"><?php _e('FleetOS API URL', 'fleetos-booking'); ?></label>
                </th>
                <td>
                    <input 
                        type="url" 
                        id="fleetos_api_url" 
                        name="fleetos_api_url" 
                        value="<?php echo esc_attr($options['fleetos_api_url'] ?? 'https://fleetos.eu/api/v1'); ?>" 
                        class="regular-text"
                    >
                    <p class="description">
                        <?php _e('The base URL for FleetOS API', 'fleetos-booking'); ?>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="redirect_url"><?php _e('Redirect URL', 'fleetos-booking'); ?></label>
                </th>
                <td>
                    <input 
                        type="url" 
                        id="redirect_url" 
                        name="redirect_url" 
                        value="<?php echo esc_attr($options['redirect_url'] ?? 'https://fleetos.eu/booking'); ?>" 
                        class="regular-text"
                    >
                    <p class="description">
                        <?php _e('Where to redirect users after form submission', 'fleetos-booking'); ?>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row"><?php _e('Form Options', 'fleetos-booking'); ?></th>
                <td>
                    <fieldset>
                        <label>
                            <input 
                                type="checkbox" 
                                name="show_pickup_location" 
                                value="1" 
                                <?php checked($options['show_pickup_location'] ?? true, 1); ?>
                            >
                            <?php _e('Show Pickup Location', 'fleetos-booking'); ?>
                        </label>
                        <br>
                        <label>
                            <input 
                                type="checkbox" 
                                name="show_dropoff_location" 
                                value="1" 
                                <?php checked($options['show_dropoff_location'] ?? true, 1); ?>
                            >
                            <?php _e('Show Dropoff Location', 'fleetos-booking'); ?>
                        </label>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="default_pickup_time"><?php _e('Default Pickup Time', 'fleetos-booking'); ?></label>
                </th>
                <td>
                    <input 
                        type="time" 
                        id="default_pickup_time" 
                        name="default_pickup_time" 
                        value="<?php echo esc_attr($options['default_pickup_time'] ?? '10:00'); ?>"
                    >
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="default_dropoff_time"><?php _e('Default Dropoff Time', 'fleetos-booking'); ?></label>
                </th>
                <td>
                    <input 
                        type="time" 
                        id="default_dropoff_time" 
                        name="default_dropoff_time" 
                        value="<?php echo esc_attr($options['default_dropoff_time'] ?? '10:00'); ?>"
                    >
                </td>
            </tr>
        </table>
        
        <p class="submit">
            <input 
                type="submit" 
                name="fleetos_booking_submit" 
                class="button button-primary" 
                value="<?php _e('Save Settings', 'fleetos-booking'); ?>"
            >
        </p>
    </form>
    
    <hr>
    
    <h2><?php _e('Usage', 'fleetos-booking'); ?></h2>
    <p><?php _e('You can add the booking form to your site using:', 'fleetos-booking'); ?></p>
    <ul>
        <li><strong><?php _e('Shortcode:', 'fleetos-booking'); ?></strong> <code>[fleetos_booking_form]</code></li>
        <li><strong><?php _e('Widget:', 'fleetos-booking'); ?></strong> <?php _e('Go to Appearance → Widgets and add "FleetOS Booking Form"', 'fleetos-booking'); ?></li>
    </ul>
</div>

