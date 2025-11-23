import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Avatar from "../../components/ui/avatar/Avatar";
import PageMeta from "../../components/common/PageMeta";
import { User } from "../../types/user";

const mockUser: Partial<User> = {
  name: 'Test User',
  avatarUrl: '/images/user/user-01.jpg',
};

const mockUserWoman: Partial<User> = {
    name: 'Test User',
    gender: 'M'
}

const mockUserMan: Partial<User> = {
    name: 'Test User',
    gender: 'H'
}

const mockUserNoGender: Partial<User> = {
    name: 'Test User',
}

export default function Avatars() {
  return (
    <>
      <PageMeta
        title="React.js Avatars Dashboard | TailAdmin - React.js Admin Dashboard Template"
        description="This is React.js Avatars Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <PageBreadcrumb pageTitle="Avatars" />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title="Default Avatar">
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar user={mockUser} size="xsmall" />
            <Avatar user={mockUser} size="small" />
            <Avatar user={mockUserWoman} size="medium" />
            <Avatar user={mockUserMan} size="large" />
            <Avatar user={mockUserNoGender} size="xlarge" />
            <Avatar user={mockUser} size="xxlarge" />
          </div>
        </ComponentCard>
        <ComponentCard title="Avatar with online indicator">
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar
              user={mockUser}
              size="xsmall"
              status="online"
            />
            <Avatar
              user={mockUser}
              size="small"
              status="online"
            />
            <Avatar
              user={mockUser}
              size="medium"
              status="online"
            />
            <Avatar
              user={mockUser}
              size="large"
              status="online"
            />
            <Avatar
              user={mockUser}
              size="xlarge"
              status="online"
            />
            <Avatar
              user={mockUser}
              size="xxlarge"
              status="online"
            />
          </div>
        </ComponentCard>
        <ComponentCard title="Avatar with Offline indicator">
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar
              user={mockUser}
              size="xsmall"
              status="offline"
            />
            <Avatar
              user={mockUser}
              size="small"
              status="offline"
            />
            <Avatar
              user={mockUser}
              size="medium"
              status="offline"
            />
            <Avatar
              user={mockUser}
              size="large"
              status="offline"
            />
            <Avatar
              user={mockUser}
              size="xlarge"
              status="offline"
            />
            <Avatar
              user={mockUser}
              size="xxlarge"
              status="offline"
            />
          </div>
        </ComponentCard>{" "}
        <ComponentCard title="Avatar with busy indicator">
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar
              user={mockUser}
              size="xsmall"
              status="busy"
            />
            <Avatar user={mockUser} size="small" status="busy" />
            <Avatar
              user={mockUser}
              size="medium"
              status="busy"
            />
            <Avatar user={mockUser} size="large" status="busy" />
            <Avatar
              user={mockUser}
              size="xlarge"
              status="busy"
            />
            <Avatar
              user={mockUser}
              size="xxlarge"
              status="busy"
            />
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
