<?php
/**
 * Booking Form Template
 */

if (!defined('ABSPATH')) {
    exit;
}

$options = get_option('fleetos_booking_options');
$org_slug = $options['organization_slug'] ?? '';
$api_url = $options['fleetos_api_url'] ?? 'https://fleetos.eu/api/v1';
$show_pickup_location = $options['show_pickup_location'] ?? true;
$show_dropoff_location = $options['show_dropoff_location'] ?? true;
$default_pickup_time = $options['default_pickup_time'] ?? '10:00';
$default_dropoff_time = $options['default_dropoff_time'] ?? '10:00';

// Get locations via API (cached)
$locations = get_transient('fleetos_locations_' . $org_slug);
if (false === $locations) {
    $response = wp_remote_get($api_url . '/organizations/' . $org_slug . '/locations', array(
        'timeout' => 10,
    ));
    
    if (!is_wp_error($response)) {
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        $locations = $data['locations'] ?? array();
        set_transient('fleetos_locations_' . $org_slug, $locations, HOUR_IN_SECONDS);
    } else {
        $locations = array();
    }
}

$min_date = date('Y-m-d');
$max_date = date('Y-m-d', strtotime('+1 year'));
?>

<div class="fleetos-booking-form-container">
    <form class="fleetos-booking-form" method="post">
        <?php if ($show_pickup_location): ?>
        <div class="fleetos-form-group">
            <label for="pickup_location_id">
                <?php _e('Pickup Location', 'fleetos-booking'); ?> <span class="required">*</span>
            </label>
            <select name="pickup_location_id" id="pickup_location_id" required>
                <option value=""><?php _e('Select Location', 'fleetos-booking'); ?></option>
                <?php foreach ($locations as $location): ?>
                    <option value="<?php echo esc_attr($location['id']); ?>">
                        <?php echo esc_html($location['name_el'] ?? $location['name']); ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        <?php endif; ?>
        
        <div class="fleetos-form-row">
            <div class="fleetos-form-group">
                <label for="pickup_date">
                    <?php _e('Pickup Date', 'fleetos-booking'); ?> <span class="required">*</span>
                </label>
                <input 
                    type="date" 
                    name="pickup_date" 
                    id="pickup_date" 
                    min="<?php echo esc_attr($min_date); ?>" 
                    max="<?php echo esc_attr($max_date); ?>"
                    required
                >
            </div>
            
            <div class="fleetos-form-group">
                <label for="pickup_time">
                    <?php _e('Pickup Time', 'fleetos-booking'); ?>
                </label>
                <input 
                    type="time" 
                    name="pickup_time" 
                    id="pickup_time" 
                    value="<?php echo esc_attr($default_pickup_time); ?>"
                >
            </div>
        </div>
        
        <?php if ($show_dropoff_location): ?>
        <div class="fleetos-form-group">
            <label for="dropoff_location_id">
                <?php _e('Dropoff Location', 'fleetos-booking'); ?> <span class="required">*</span>
            </label>
            <select name="dropoff_location_id" id="dropoff_location_id" required>
                <option value=""><?php _e('Select Location', 'fleetos-booking'); ?></option>
                <?php foreach ($locations as $location): ?>
                    <option value="<?php echo esc_attr($location['id']); ?>">
                        <?php echo esc_html($location['name_el'] ?? $location['name']); ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        <?php endif; ?>
        
        <div class="fleetos-form-row">
            <div class="fleetos-form-group">
                <label for="dropoff_date">
                    <?php _e('Dropoff Date', 'fleetos-booking'); ?> <span class="required">*</span>
                </label>
                <input 
                    type="date" 
                    name="dropoff_date" 
                    id="dropoff_date" 
                    min="<?php echo esc_attr($min_date); ?>" 
                    max="<?php echo esc_attr($max_date); ?>"
                    required
                >
            </div>
            
            <div class="fleetos-form-group">
                <label for="dropoff_time">
                    <?php _e('Dropoff Time', 'fleetos-booking'); ?>
                </label>
                <input 
                    type="time" 
                    name="dropoff_time" 
                    id="dropoff_time" 
                    value="<?php echo esc_attr($default_dropoff_time); ?>"
                >
            </div>
        </div>
        
        <div class="fleetos-form-group">
            <button type="submit" class="fleetos-submit-button">
                <?php _e('Search Available Cars', 'fleetos-booking'); ?>
            </button>
        </div>
    </form>
</div>

<script>
jQuery(document).ready(function($) {
    // Set minimum dropoff date based on pickup date
    $('#pickup_date').on('change', function() {
        const pickupDate = $(this).val();
        if (pickupDate) {
            const minDropoffDate = new Date(pickupDate);
            minDropoffDate.setDate(minDropoffDate.getDate() + 1);
            $('#dropoff_date').attr('min', minDropoffDate.toISOString().split('T')[0]);
        }
    });
});
</script>

