<?php
/**
 * Plugin Name: LinguAI — podpisany kontekst ucznia
 * Description: Adapter dla Memory API 3.0. Wymaga skoordynowanego wdrożenia backendu i narzędzia ElevenLabs.
 * Version: 1.0.0
 */
defined('ABSPATH') || exit;

function linguai_context_language($value) {
    $aliases = array('en'=>'angielski','english'=>'angielski','angielski'=>'angielski',
        'es'=>'hiszpański','spanish'=>'hiszpański','español'=>'hiszpański','hiszpanski'=>'hiszpański','hiszpański'=>'hiszpański',
        'it'=>'włoski','italian'=>'włoski','italiano'=>'włoski','wloski'=>'włoski','włoski'=>'włoski',
        'zh'=>'chiński','zh-cn'=>'chiński','chinese'=>'chiński','mandarin'=>'chiński','chinski'=>'chiński','chiński'=>'chiński');
    return is_string($value) ? ($aliases[strtolower(trim($value))] ?? null) : null;
}
function linguai_context_sign($uid, $language, $scope, $secret) {
    $now = time();
    $claims = array('v'=>1,'iss'=>'https://linguai.pl','aud'=>'linguai-memory',
        'sub'=>(int)$uid,'language'=>$language,'scope'=>$scope,'iat'=>$now,
        'exp'=>$now+($scope==='memory:get' ? 120 : 7200));
    $payload = rtrim(strtr(base64_encode(wp_json_encode($claims)), '+/', '-_'), '=');
    $signature = hash_hmac('sha256', 'linguai-learner-v1.'.$payload, $secret, true);
    return $payload.'.'.rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
}
add_action('template_redirect', function () {
    if (is_user_logged_in()) { nocache_headers(); }
}, 0);

// Runs after the existing learning.php language filter. No client-supplied user id is trusted.
add_filter('http_request_args', function ($args, $url) {
    if ($url !== 'https://stefcio-memory.onrender.com/api/memory/get') { return $args; }
    $uid = get_current_user_id();
    $body = is_string($args['body'] ?? null) ? json_decode($args['body'], true) : ($args['body'] ?? array());
    $headers = $args['headers'] ?? array();
    $secret = '';
    if (is_array($headers)) {
        foreach ($headers as $name=>$value) {
            if (strtolower($name)==='x-linguai-secret' && is_string($value)) { $secret=$value; }
        }
    }
    $language = is_array($body) ? linguai_context_language($body['language'] ?? 'it') : null;
    if (!$uid || !$secret || !$language || !is_array($body)) {
        // Deliberately unauthenticated: the API must reject this request.
        $args['headers'] = array('Content-Type'=>'application/json');
        return $args;
    }
    $body['wp_user_id'] = (int)$uid;
    unset($body['wpUserId']);
    $body['language'] = $language;
    $args['body'] = wp_json_encode($body);
    $args['headers']['x-linguai-context'] = linguai_context_sign($uid,$language,'memory:get',$secret);
    // Only a bounded save capability reaches the learner's browser, never the shared secret.
    $GLOBALS['linguai_save_context'][$uid][$language] = linguai_context_sign($uid,$language,'memory:save',$secret);
    return $args;
}, 99, 2);

add_filter('do_shortcode_tag', function ($output, $tag) {
    if ($tag!=='stefcio_widget' || !is_user_logged_in() || !class_exists('DOMDocument')) { return $output; }
    $uid = get_current_user_id();
    $old = libxml_use_internal_errors(true);
    $doc = new DOMDocument();
    $doc->loadHTML('<?xml encoding="UTF-8">'.$output);
    foreach ($doc->getElementsByTagName('elevenlabs-convai') as $widget) {
        $vars = json_decode($widget->getAttribute('dynamic-variables'), true);
        if (!is_array($vars) || (string)($vars['wp_user_id'] ?? '') !== (string)$uid) { continue; }
        $language = linguai_context_language($vars['language'] ?? 'it');
        $token = $GLOBALS['linguai_save_context'][$uid][$language] ?? null;
        if (!$token) { continue; }
        $widget->setAttribute('dynamic-variables', wp_json_encode(array_merge($vars,array('secret__learner_context'=>$token))));
        $after = $doc->saveHTML($widget);
        // Replace only the widget element; leave the surrounding WordPress markup intact.
        $output = preg_replace_callback('~<elevenlabs-convai\b[^>]*>.*?</elevenlabs-convai>~is',
            function ($match) use ($after) { return $after; }, $output, 1);
        break;
    }
    libxml_clear_errors(); libxml_use_internal_errors($old);
    return $output;
}, 99, 2);
