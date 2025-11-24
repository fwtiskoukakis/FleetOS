<?php
/**
 * Booking Form Template - Modern Commercial Design
 */

if (!defined('ABSPATH')) {
    exit;
}

$options = get_option('fleetos_booking_options');
$org_slug = $options['organization_slug'] ?? '';
$api_url = $options['fleetos_api_url'] ?? 'https://fleetos.eu/api/v1';
$show_pickup_location = $options['show_pickup_location'] ?? true;

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

// Set default dates: today for pickup, 3 days later for dropoff
$today = new DateTime();
$pickup_date = $today->format('Y-m-d');
$pickup_time = $today->format('H:i');

$dropoff_date_obj = clone $today;
$dropoff_date_obj->modify('+3 days');
$dropoff_date = $dropoff_date_obj->format('Y-m-d');
$dropoff_time = $pickup_time;

$min_date = $today->format('Y-m-d');
$max_date = $today->modify('+1 year')->format('Y-m-d');
?>

<div class="fleetos-booking-form-wrapper">
    <div class="fleetos-booking-form-container">
        <form class="fleetos-booking-form" method="post">
            <!-- Vehicle Type Selector -->
            <div class="fleetos-vehicle-type-selector">
                <div class="fleetos-vehicle-type-item active" data-type="car">
                    <div class="fleetos-vehicle-icon">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5H6.5C5.84 5 5.28 5.42 5.08 6.01L3 12V20C3 20.55 3.45 21 4 21H5C5.55 21 6 20.55 6 20V19H18V20C18 20.55 18.45 21 19 21H20C20.55 21 21 20.55 21 20V12L18.92 6.01ZM6.5 6.5H17.5L19.11 11H4.89L6.5 6.5ZM7 16.5C6.17 16.5 5.5 15.83 5.5 15S6.17 13.5 7 13.5 8.5 14.17 8.5 15 7.83 16.5 7 16.5ZM17 16.5C16.17 16.5 15.5 15.83 15.5 15S16.17 13.5 17 13.5 18.5 14.17 18.5 15 17.83 16.5 17 16.5Z" fill="currentColor"/>
                        </svg>
                    </div>
                    <span class="fleetos-vehicle-label"><?php _e('CAR', 'fleetos-booking'); ?></span>
                </div>
                <div class="fleetos-vehicle-type-item" data-type="atv">
                    <div class="fleetos-vehicle-icon">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 7H18.18L16.48 2.32C16.19 1.53 15.44 1 14.6 1H9.4C8.56 1 7.81 1.53 7.52 2.32L5.82 7H5C3.9 7 3 7.9 3 9V10C3 10.55 3.45 11 4 11H5V18C5 19.1 5.9 20 7 20H8C9.1 20 10 19.1 10 18V11H14V18C14 19.1 14.9 20 16 20H17C18.1 20 19 19.1 19 18V11H20C20.55 11 21 10.55 21 10V9C21 7.9 20.1 7 19 7ZM9.4 3H14.6L15.86 7H8.14L9.4 3ZM7 9C6.45 9 6 9.45 6 10S6.45 11 7 11 8 10.55 8 10 7.55 9 7 9ZM17 9C16.45 9 16 9.45 16 10S16.45 11 17 11 18 10.55 18 10 17.55 9 17 9Z" fill="currentColor"/>
                        </svg>
                    </div>
                    <span class="fleetos-vehicle-label"><?php _e('ATV', 'fleetos-booking'); ?></span>
                </div>
                <div class="fleetos-vehicle-type-item" data-type="scooter">
                    <div class="fleetos-vehicle-icon">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 10C17.9 10 17 10.9 17 12C17 13.1 17.9 14 19 14S21 13.1 21 12C21 10.9 20.1 10 19 10ZM5 10C3.9 10 3 10.9 3 12C3 13.1 3.9 14 5 14S7 13.1 7 12C7 10.9 6.1 10 5 10ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14S14 13.1 14 12C14 10.9 13.1 10 12 10ZM12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20C16.42 20 20 16.42 20 12C20 7.58 16.42 4 12 4ZM12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C15.31 6 18 8.69 18 12C18 15.31 15.31 18 12 18Z" fill="currentColor"/>
                        </svg>
                    </div>
                    <span class="fleetos-vehicle-label"><?php _e('SCOOTER', 'fleetos-booking'); ?></span>
                </div>
            </div>
            
            <input type="hidden" name="vehicle_type" id="vehicle_type" value="car">
            
            <!-- Compact Form Fields -->
            <div class="fleetos-form-compact">
                <?php if ($show_pickup_location && !empty($locations)): ?>
                <div class="fleetos-form-group-compact">
                    <label for="pickup_location_id" class="fleetos-label-compact">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5Z" fill="currentColor"/>
                        </svg>
                        <?php _e('Pickup Location', 'fleetos-booking'); ?>
                    </label>
                    <select name="pickup_location_id" id="pickup_location_id" class="fleetos-input-compact" required>
                        <option value=""><?php _e('Select Location', 'fleetos-booking'); ?></option>
                        <?php foreach ($locations as $location): ?>
                            <option value="<?php echo esc_attr($location['id']); ?>">
                                <?php echo esc_html($location['name_el'] ?? $location['name']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <?php endif; ?>
                
                <div class="fleetos-form-row-compact">
                    <div class="fleetos-form-group-compact">
                        <label for="pickup_date" class="fleetos-label-compact">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19ZM7 10H9V12H7V10ZM11 10H13V12H11V10ZM15 10H17V12H15V10Z" fill="currentColor"/>
                            </svg>
                            <?php _e('Pickup', 'fleetos-booking'); ?>
                        </label>
                        <div class="fleetos-date-time-group">
                            <input 
                                type="date" 
                                name="pickup_date" 
                                id="pickup_date" 
                                class="fleetos-input-compact"
                                value="<?php echo esc_attr($pickup_date); ?>"
                                min="<?php echo esc_attr($min_date); ?>" 
                                max="<?php echo esc_attr($max_date); ?>"
                                required
                            >
                            <input 
                                type="time" 
                                name="pickup_time" 
                                id="pickup_time" 
                                class="fleetos-input-compact"
                                value="<?php echo esc_attr($pickup_time); ?>"
                            >
                        </div>
                    </div>
                    
                    <div class="fleetos-form-group-compact">
                        <label for="dropoff_date" class="fleetos-label-compact">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19ZM7 10H9V12H7V10ZM11 10H13V12H11V10ZM15 10H17V12H15V10Z" fill="currentColor"/>
                            </svg>
                            <?php _e('Dropoff', 'fleetos-booking'); ?>
                        </label>
                        <div class="fleetos-date-time-group">
                            <input 
                                type="date" 
                                name="dropoff_date" 
                                id="dropoff_date" 
                                class="fleetos-input-compact"
                                value="<?php echo esc_attr($dropoff_date); ?>"
                                min="<?php echo esc_attr($min_date); ?>" 
                                max="<?php echo esc_attr($max_date); ?>"
                                required
                            >
                            <input 
                                type="time" 
                                name="dropoff_time" 
                                id="dropoff_time" 
                                class="fleetos-input-compact"
                                value="<?php echo esc_attr($dropoff_time); ?>"
                            >
                        </div>
                    </div>
                </div>
                
                <!-- Dropoff Location Toggle -->
                <div class="fleetos-dropoff-location-toggle">
                    <label class="fleetos-checkbox-label">
                        <input type="checkbox" id="different_dropoff_location" name="different_dropoff_location">
                        <span class="fleetos-checkbox-custom"></span>
                        <span class="fleetos-checkbox-text"><?php _e('Different dropoff location', 'fleetos-booking'); ?></span>
                    </label>
                </div>
                
                <div class="fleetos-dropoff-location-wrapper" id="dropoff_location_wrapper" style="display: none;">
                    <div class="fleetos-form-group-compact">
                        <label for="dropoff_location_id" class="fleetos-label-compact">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5Z" fill="currentColor"/>
                            </svg>
                            <?php _e('Dropoff Location', 'fleetos-booking'); ?>
                        </label>
                        <select name="dropoff_location_id" id="dropoff_location_id" class="fleetos-input-compact">
                            <option value=""><?php _e('Select Location', 'fleetos-booking'); ?></option>
                            <?php foreach ($locations as $location): ?>
                                <option value="<?php echo esc_attr($location['id']); ?>">
                                    <?php echo esc_html($location['name_el'] ?? $location['name']); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
                
                <button type="submit" class="fleetos-submit-button-modern">
                    <span><?php _e('Search Availability', 'fleetos-booking'); ?></span>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 5L16 12L9 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        </form>
    </div>
</div>

