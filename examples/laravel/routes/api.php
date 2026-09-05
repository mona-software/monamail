<?php
use App\Mail\MonaMailOtp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use MonaMail\MonaMailError;
Route::post('/otp', function (Request $request, MonaMailOtp $otp) {
    $data = $request->validate(['email' => ['required', 'email', 'max:254']]);
    try {
        $sent = $otp->send($data['email']);
        return response()->json(['id' => $sent['id'], 'status' => $sent['status']], 202);
    } catch (MonaMailError $e) {
        return response()->json(['error' => 'Chưa gửi được OTP.', 'request_id' => $e->request_id], 503);
    }
})->middleware('throttle:5,1');
