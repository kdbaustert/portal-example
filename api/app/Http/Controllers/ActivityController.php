<?php

namespace App\Http\Controllers;

use App\Http\Resources\ActivityResource;
use App\Models\Activity;
use App\Models\Document;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    public function index(Request $request)
    {
        return ActivityResource::collection(
            Activity::visibleTo($request->user())
                ->with(['user', 'client'])
                ->latest('created_at')->latest('id')
                ->paginate(50)
        );
    }

    public function forDocument(Request $request, Document $document)
    {
        $this->authorize('view', $document);

        return ActivityResource::collection(
            $document->hasMany(Activity::class)
                ->with('user')
                ->latest('created_at')->latest('id')
                ->limit(100)
                ->get()
        );
    }
}
