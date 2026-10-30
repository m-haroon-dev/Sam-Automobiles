# SAM Automobiles — Laravel webapp conversion

Approved scope: preserve the current showroom design and hero; use React + Tailwind CSS and a Laravel/PHP backend with an authenticated admin for inventory, photos, published/draft/sold states and featured cars. New/edited database cars must appear automatically on inventory/detail/featured/sold pages. Preserve supplied 2014/789 facts and 11am–7pm hours. Current live static Site stays available; it cannot execute Laravel PHP.

1. Install isolated local runtimes and pin compatible Laravel/React/Inertia/Tailwind dependencies.
2. Add migrations, Eloquent models, policies/middleware, input/image validation and responsive image storage; seed the actual nine listings and 39 photos. No fabricated stock or testimonials.
3. Connect public React components to Laravel props; retain pretty routes, photo frames, original 60fps hero and native touch carousel.
4. Add admin login, inventory dashboard, car editor, publish/draft/sold controls, feature selection/order, photo cover/order/removal and archive.
5. Verify backend persistence, auth/CSRF/authorization, validation and real uploads, then browser-check phone/tablet/laptop pages and motion. Use disposable test data, never mark actual seeded cars sold for demonstrations.
6. Package source and prebuilt Hostinger deployment files with no secrets or test database. Explain PHP/database/private-root setup and provide a continuation record.

Working directory is this folder. Baseline: ../sam-automobiles-door-hostinger-release-2026-10-29. Preserve the previous release and public wheel Site. Do not claim the new backend is publicly deployed without actual PHP hosting.
